import axios from '../../../lib/axios';

export const getTravelRates = () => axios.get('/travel-rates').then(r=>r.data.rates);
export const upsertTravelRate = (payload) => axios.post('/travel-rates/upsert', payload).then(r=>r.data.rate);
export const deleteTravelRate = (id) => axios.delete(`/travel-rates/${id}`).then(r=>r.data);
