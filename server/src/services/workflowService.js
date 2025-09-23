const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Utility to resolve dynamic assignees to user IDs
async function resolveAssignees(stepDef, target) {
  const resolvers = Array.isArray(stepDef.dynamic_assignees) ? stepDef.dynamic_assignees : [];
  const userIds = new Set();

  for (const r of resolvers) {
    if (!r || !r.type) continue;
    switch (r.type) {
      case 'REPORTING_OFFICER': {
        // Determine employee_id from target
        let employeeId = null;
        if (target.__type === 'TravelRequest') employeeId = target.applicant_id;
        if (target.__type === 'TravelClaim') employeeId = target.employee_id;
        if (employeeId) {
          const emp = await prisma.employment.findFirst({ where: { employee_id: employeeId, is_current: true } });
          const roEmpId = emp?.reporting_officer_id ? parseInt(emp.reporting_officer_id) : null;
          if (roEmpId) {
            const roUser = await prisma.user.findFirst({ where: { employee_id: roEmpId, is_deleted: false }, select: { id: true } });
            if (roUser) userIds.add(roUser.id);
          }
        }
        break;
      }
      case 'PERMISSION': {
        const key = r.value;
        if (!key) break;
        // All users whose role has the permission key
        const users = await prisma.user.findMany({
          where: {
            is_deleted: false,
            role: {
              is: {
                rolePermissions: {
                  some: { permission: { key } }
                },
                enabled: true,
                is_deleted: false,
              }
            }
          },
          select: { id: true }
        });
        for (const u of users) userIds.add(u.id);
        break;
      }
      default:
        break;
    }
  }
  return Array.from(userIds);
}

class WorkflowService {
  async ensureDefinition(key) {
    const def = await prisma.workflowDefinition.findUnique({ where: { key }, include: { steps: true } });
    if (!def || !def.steps?.length) throw new Error(`Workflow definition missing or empty: ${key}`);
    return def;
  }

  async createInstanceFor(targetType, targetId, defKey) {
    const def = await this.ensureDefinition(defKey);

    // Load target record
    let target = null;
    if (targetType === 'TravelRequest') {
      target = await prisma.travelRequest.findUnique({ where: { id: targetId } });
      if (!target) throw new Error('Travel Request not found');
      target.__type = 'TravelRequest';
    } else if (targetType === 'TravelClaim') {
      target = await prisma.travelClaim.findUnique({ where: { id: targetId } });
      if (!target) throw new Error('Travel Claim not found');
      target.__type = 'TravelClaim';
    } else {
      throw new Error('Unsupported targetType');
    }

    // Create instance
    const instance = await prisma.workflowInstance.create({
      data: {
        target_type: targetType,
        target_id: targetId,
        status: 'PENDING',
        current_step_order: def.steps[0]?.order || null,
      }
    });

    // Create step instances
    for (const s of def.steps.sort((a,b)=>a.order-b.order)) {
      const assignees = await resolveAssignees(s, target);
      await prisma.workflowStepInstance.create({
        data: {
          instance_id: instance.id,
          step_def_id: s.id,
          order: s.order,
          status: 'PENDING',
          approval_mode: s.approval_mode,
          required_count: s.required_count || null,
          approved_count: 0,
          assignees,
        }
      });
    }

    return await prisma.workflowInstance.findUnique({ where: { id: instance.id }, include: { step_instances: true } });
  }

  async getPendingForUser(userId, filter = {}) {
    // Step instances where status PENDING and assignees contains userId
    const steps = await prisma.workflowStepInstance.findMany({
      where: {
        status: 'PENDING',
        assignees: { array_contains: userId },
        instance: {
          status: 'PENDING',
          ...(filter.target_type ? { target_type: filter.target_type } : {}),
        }
      },
      include: { instance: true, step_definition: { include: { definition: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return steps;
  }

  async actOnInstance(instanceId, userId, decision, comment) {
    const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId }, include: { step_instances: true } });
    if (!instance) throw new Error('Workflow instance not found');
    if (instance.status !== 'PENDING') throw new Error('Workflow already finished');

    const current = instance.step_instances.find(si => si.order === instance.current_step_order);
    if (!current) throw new Error('Current step missing');
    if (current.status !== 'PENDING') throw new Error('Current step not pending');

    // Check assignment
    if (!Array.isArray(current.assignees) || !current.assignees.includes(userId)) {
      throw new Error('Not assigned to current user');
    }

    // Record decision
    await prisma.approval.create({ data: { step_instance_id: current.id, approver_user_id: userId, decision, comment: comment || null } });

    if (decision === 'REJECT' || decision === 'RETURN') {
      // Close instance as REJECTED
      await prisma.workflowStepInstance.update({ where: { id: current.id }, data: { status: 'REJECTED' } });
      await prisma.workflowInstance.update({ where: { id: instanceId }, data: { status: 'REJECTED', current_step_order: null } });
      return { finished: true, status: 'REJECTED' };
    }

    // Approve path
    const mode = current.approval_mode;
    let approvedCount = (current.approved_count || 0) + 1;
    let required = 1;
    if (mode === 'ALL') required = Array.isArray(current.assignees) ? current.assignees.length : 1;
    if (mode === 'ANY') required = 1;
    if (mode === 'QUORUM') required = current.required_count || 1;

    let stepApproved = approvedCount >= required;

    await prisma.workflowStepInstance.update({ where: { id: current.id }, data: { approved_count: approvedCount, status: stepApproved ? 'APPROVED' : 'PENDING' } });

    if (stepApproved) {
      // Advance to next step or finish
      const remaining = instance.step_instances.filter(si => si.order > current.order).sort((a,b)=>a.order-b.order);
      if (remaining.length === 0) {
        await prisma.workflowInstance.update({ where: { id: instanceId }, data: { status: 'APPROVED', current_step_order: null } });
        return { finished: true, status: 'APPROVED' };
      } else {
        await prisma.workflowInstance.update({ where: { id: instanceId }, data: { current_step_order: remaining[0].order } });
        return { finished: false, status: 'PENDING', next: remaining[0].order };
      }
    }

    return { finished: false, status: 'PENDING' };
  }
}

module.exports = new WorkflowService();
