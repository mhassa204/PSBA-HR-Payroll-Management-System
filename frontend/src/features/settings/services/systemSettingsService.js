import api from '../../../lib/axios';

const systemSettingsService = {
  // Database (read-only)
  async getDatabase() {
    const { data } = await api.get('/settings/database');
    return data?.database;
  },

  // Security
  async getSecurity() {
    const { data } = await api.get('/settings/security');
    return data?.security;
  },
  async updateSecurity(payload) {
    const { data } = await api.put('/settings/security', payload);
    return data?.security;
  },

  // Themes/UI
  async getThemes() {
    const { data } = await api.get('/settings/themes');
    return data?.ui;
  },
  async updateThemes(payload) {
    const { data } = await api.put('/settings/themes', payload);
    return data?.ui;
  }
};

export default systemSettingsService;
