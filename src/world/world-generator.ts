import { World } from "./world";

export interface WorldGenerator {
    generate(): World
}