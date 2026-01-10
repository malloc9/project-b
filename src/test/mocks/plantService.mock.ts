import { vi } from 'vitest';

const mockPlant = {
  id: 'mock-plant-1',
  userId: 'test-user-123',
  name: 'Mock Monstera',
  species: 'Monstera Deliciosa',
  description: 'A beautiful mock plant',
  photos: [],
  careTasks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const PlantService = {
  getUserPlants: vi.fn().mockResolvedValue([mockPlant]),
  getPlant: vi.fn().mockResolvedValue(mockPlant),
  createPlant: vi.fn().mockResolvedValue('mock-plant-id'),
  updatePlant: vi.fn().mockResolvedValue(undefined),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  validatePlantData: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  addCareTaskToPlant: vi.fn().mockResolvedValue('mock-task-id'),
  addPhotoToPlant: vi.fn().mockResolvedValue({}),
};

export default PlantService;
