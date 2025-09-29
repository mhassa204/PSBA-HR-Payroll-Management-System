const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  list: async (req, res) => {
    try { const rates = await prisma.travelRate.findMany({ include: { scale_grade: true } }); res.json({ success:true, rates }); } catch(e){ res.status(500).json({ success:false, error: e.message }); }
  },
  getOne: async (req, res) => {
    try { const rate = await prisma.travelRate.findUnique({ where: { id: Number(req.params.id) }, include: { scale_grade: true } }); if(!rate) return res.status(404).json({ success:false, error:'Not found' }); res.json({ success:true, rate }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  upsertByScale: async (req, res) => {
    try {
      const scale_grade_id = Number(req.body.scale_grade_id);
      if(!scale_grade_id) return res.status(400).json({ success:false, error:'scale_grade_id required'});
      const payload = { rate_per_km: Number(req.body.rate_per_km||0), per_diem_rate: Number(req.body.per_diem_rate||0), is_active: req.body.is_active !== false };
      const existing = await prisma.travelRate.findUnique({ where: { scale_grade_id } });
      let rate;
      if(existing){
        rate = await prisma.travelRate.update({ where: { id: existing.id }, data: payload });
      } else {
        rate = await prisma.travelRate.create({ data: { ...payload, scale_grade_id } });
      }
      res.json({ success:true, rate });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  delete: async (req, res) => {
    try { await prisma.travelRate.delete({ where: { id: Number(req.params.id) } }); res.json({ success:true }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  }
};
