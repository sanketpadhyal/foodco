import { computeHealthRating } from '../src/DASHBOARD/productService';

describe('Unhealthy products score below 50', () => {
  test('Maggi 2-Minute Masala Noodles', () => {

    const result = computeHealthRating(
      { calories: 427, sugars: 2.2, saturatedFat: 6.8, salt: 2.1, fiber: 3.6, protein: 8.0 },
      4,   // NOVA 4
      true, // palm oil
      ['E635', 'E500', 'E451']
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeLessThan(50);
  });

  test("Lay's Classic Salted Potato Chips", () => {

    const result = computeHealthRating(
      { calories: 544, sugars: 1.2, saturatedFat: 14.1, salt: 1.2, fiber: 4.1, protein: 6.9 },
      3,
      true,
      []
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeLessThan(50);
  });

  test('Kurkure Masala Munch (fried extruded snack)', () => {

    const result = computeHealthRating(
      { calories: 520, sugars: 3.5, saturatedFat: 11.0, salt: 1.8, fiber: 1.5, protein: 5.0 },
      4,
      true,
      ['E627', 'E631']
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeLessThan(50);
  });

  test('Coca-Cola / Thums Up (sugary soft drink, 10.6g sugar/100ml)', () => {

    const result = computeHealthRating(
      { calories: 42, sugars: 10.6, saturatedFat: 0, salt: 0.02, fiber: 0, protein: 0,
        isBeverage: true, isSugaryDrink: true },
      4,
      false,
      ['E150d', 'E338']
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeLessThan(50);
    expect(result.score).toBeLessThanOrEqual(35);
  });

  test('Packaged fruit juice (not 100% juice)', () => {

    const result = computeHealthRating(
      { calories: 46, sugars: 10.0, saturatedFat: 0, salt: 0.01, fiber: 0.2, protein: 0.3,
        isBeverage: true, isJuice: true, is100PctJuice: false },
      3,
      false,
      []
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(50);
  });

  test('Oreo Original Sandwich Cookies', () => {

    const result = computeHealthRating(
      { calories: 474, sugars: 38.0, saturatedFat: 5.2, salt: 0.74, fiber: 2.7, protein: 5.4 },
      4,
      true,
      ['E500', 'E503', 'E322']
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeLessThan(50);
  });
});

describe('Healthy whole foods score above 70', () => {
  test('Plain rolled oats', () => {

    const result = computeHealthRating(
      { calories: 389, sugars: 1.1, saturatedFat: 1.4, salt: 0.01, fiber: 10.6, protein: 16.9 },
      1,
      false,
      []
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeGreaterThan(70);
  });

  test('Plain almonds (unsalted)', () => {

    const result = computeHealthRating(
      { calories: 579, sugars: 4.4, saturatedFat: 3.8, salt: 0.001, fiber: 12.5, protein: 21.2 },
      1,
      false,
      []
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeGreaterThan(70);
  });

  test('Plain peanuts (unsalted, roasted)', () => {

    const result = computeHealthRating(
      { calories: 567, sugars: 3.97, saturatedFat: 6.28, salt: 0.004, fiber: 8.5, protein: 25.8 },
      1,
      false,
      []
    );
    expect(result.insufficientData).toBe(false);
    expect(result.score).toBeGreaterThan(70);
  });
});

describe('Missing key nutrients → insufficientData', () => {
  test('Missing sugar and saturated fat → insufficientData=true, score=0', () => {
    const result = computeHealthRating(
      { calories: 300, sugars: null, saturatedFat: null, salt: 0.5, fiber: 2.0, protein: 5.0 },
      3,
      false,
      []
    );
    expect(result.insufficientData).toBe(true);
    expect(result.score).toBe(0);
  });

  test('Missing calories → insufficientData=true, score=0', () => {
    const result = computeHealthRating(
      { calories: null, sugars: 5, saturatedFat: 2, salt: 0.3, fiber: 1.5, protein: 4.0 },
      3,
      false,
      []
    );
    expect(result.insufficientData).toBe(true);
    expect(result.score).toBe(0);
  });

  test('All nulls → insufficientData=true, score=0', () => {
    const result = computeHealthRating(
      { calories: null, sugars: null, saturatedFat: null, salt: null, fiber: null, protein: null },
      3,
      false,
      []
    );
    expect(result.insufficientData).toBe(true);
    expect(result.score).toBe(0);
  });
});

describe('Hard-cap sanity rules', () => {
  test('NOVA 4 product score is capped at 60', () => {
    const result = computeHealthRating(
      { calories: 80, sugars: 1, saturatedFat: 0.2, salt: 0.1, fiber: 5, protein: 10 },
      4,
      false,
      []
    );
    expect(result.score).toBeLessThanOrEqual(60);
  });

  test('Nutri-Score E product score is capped at 30', () => {

    const result = computeHealthRating(
      { calories: 600, sugars: 55, saturatedFat: 12, salt: 1.5, fiber: 0.5, protein: 3 },
      4,
      true,
      []
    );
    expect(result.nutriScoreGrade).toBe('E');
    expect(result.score).toBeLessThanOrEqual(30);
  });

  test('100% pure fruit juice is capped at 65', () => {
    const result = computeHealthRating(
      { calories: 45, sugars: 9.5, saturatedFat: 0, salt: 0.01, fiber: 0.3, protein: 0.5,
        isBeverage: true, isJuice: true, is100PctJuice: true },
      1,
      false,
      []
    );
    expect(result.score).toBeLessThanOrEqual(65);
  });
});
