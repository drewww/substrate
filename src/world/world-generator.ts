import { World } from "./world";

export interface WorldGenerator {
    generate(): Promise<World>
}