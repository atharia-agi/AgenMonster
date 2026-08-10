// Minimal test
export class TestClass {
  update(dt: number, wind: { x: number; y: number }, gravity: number): void {
    const subSteps = 4;
    const subDt = dt / subSteps;
    
    for (let step = 0; step < subSteps; step++) {

    }
  }
}