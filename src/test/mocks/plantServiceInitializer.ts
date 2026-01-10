import CentralPlantService from './plantService.mock';

vi.mock('../services/plantService', () => ({ PlantService: CentralPlantService, default: CentralPlantService }));
vi.mock('../../services/plantService', () => ({ PlantService: CentralPlantService, default: CentralPlantService }));

export {};
