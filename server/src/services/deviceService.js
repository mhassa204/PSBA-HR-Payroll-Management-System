const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const deviceService = {
  // Create device
  createDevice: async (data) => {
    const { ip_address, port_number, location_id } = data;
    if (!ip_address || !port_number) throw new Error("ip_address and port_number are required");

    // ensure unique ip:port
    const existing = await prisma.device.findFirst({
      where: { ip_address, port_number: Number(port_number), is_deleted: false }
    });
    if (existing) throw new Error("A device with the same IP and port already exists");

    // if location provided, ensure it exists
    let locConnect = undefined;
    if (location_id) {
      const loc = await prisma.location.findFirst({ where: { id: Number(location_id), is_deleted: false } });
      if (!loc) throw new Error("Invalid location selected");
      locConnect = { connect: { id: loc.id } };
    }

    return prisma.device.create({
      data: {
        ip_address,
        port_number: Number(port_number),
        location: locConnect
      },
      include: { location: true }
    });
  },

  // List devices
  getAllDevices: async () => {
    return prisma.device.findMany({
      where: { is_deleted: false },
      include: { location: true },
      orderBy: [{ createdAt: 'desc' }]
    });
  },

  // Get one
  getDeviceById: async (id) => {
    return prisma.device.findFirst({
      where: { id: Number(id), is_deleted: false },
      include: { location: true }
    });
  },

  // Update
  updateDevice: async (id, data) => {
    const { ip_address, port_number, location_id } = data;

    // uniqueness check when changing ip/port
    if (ip_address || port_number) {
      const exists = await prisma.device.findFirst({
        where: {
          id: { not: Number(id) },
          ip_address: ip_address || undefined,
          port_number: port_number !== undefined ? Number(port_number) : undefined,
          is_deleted: false
        }
      });
      if (exists) throw new Error("Another device already uses this IP and port");
    }

    const updateData = {};
    if (ip_address !== undefined) updateData.ip_address = ip_address;
    if (port_number !== undefined) updateData.port_number = Number(port_number);

    if (location_id !== undefined) {
      if (location_id === null) {
        updateData.location = { disconnect: true };
      } else {
        const loc = await prisma.location.findFirst({ where: { id: Number(location_id), is_deleted: false } });
        if (!loc) throw new Error("Invalid location selected");
        updateData.location = { connect: { id: loc.id } };
      }
    }

    return prisma.device.update({
      where: { id: Number(id) },
      data: updateData,
      include: { location: true }
    });
  },

  // Soft delete
  deleteDevice: async (id) => {
    return prisma.device.update({ where: { id: Number(id) }, data: { is_deleted: true } });
  }
};

module.exports = deviceService;
