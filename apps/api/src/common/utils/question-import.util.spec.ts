import { parseQuestionImportFile } from './question-import.util';

describe('question-import.util', () => {
  describe('TP-IMPORT-001 - Flexible two-to-four option imports', () => {
    it('should parse 2-option MCQ when option_C and option_D are empty/omitted', () => {
      const json = JSON.stringify([
        {
          question_text: 'Is VFR flight permitted in Class A airspace?',
          question_type: 'mcq',
          points: 1,
          option_a: 'True',
          option_b: 'False',
          option_c: '',
          option_d: '',
          answer: 'B',
        },
      ]);

      const result = parseQuestionImportFile({
        buffer: Buffer.from(json, 'utf-8'),
        filename: 'questions.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].options).toHaveLength(2);
      expect(result[0].options[0]).toEqual({
        option_text: 'True',
        is_correct: false,
      });
      expect(result[0].options[1]).toEqual({
        option_text: 'False',
        is_correct: true,
      });
    });

    it('should parse 3-option MCQ when option_D is omitted', () => {
      const json = JSON.stringify([
        {
          question_text: 'What is standard sea level pressure?',
          question_type: 'mcq',
          points: 2,
          option_a: '1013.25 hPa',
          option_b: '1000.00 hPa',
          option_c: '1020.50 hPa',
          answer: 'A',
        },
      ]);

      const result = parseQuestionImportFile({
        buffer: Buffer.from(json, 'utf-8'),
        filename: 'questions.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].options).toHaveLength(3);
      expect(result[0].options[0]).toEqual({
        option_text: '1013.25 hPa',
        is_correct: true,
      });
      expect(result[0].options[1]).toEqual({
        option_text: '1000.00 hPa',
        is_correct: false,
      });
      expect(result[0].options[2]).toEqual({
        option_text: '1020.50 hPa',
        is_correct: false,
      });
    });

    it('should parse 4-option MSQ with multiple correct answers', () => {
      const json = JSON.stringify([
        {
          question_text:
            'Which instruments operate on the pitot-static system?',
          question_type: 'msq',
          points: 3,
          option_a: 'Airspeed Indicator',
          option_b: 'Altimeter',
          option_c: 'Vertical Speed Indicator',
          option_d: 'Attitude Indicator',
          answer: 'A, B, C',
        },
      ]);

      const result = parseQuestionImportFile({
        buffer: Buffer.from(json, 'utf-8'),
        filename: 'questions.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].options).toHaveLength(4);
      expect(result[0].options[0].is_correct).toBe(true);
      expect(result[0].options[1].is_correct).toBe(true);
      expect(result[0].options[2].is_correct).toBe(true);
      expect(result[0].options[3].is_correct).toBe(false);
    });

    it('should reject questions with fewer than 2 options', () => {
      const json = JSON.stringify([
        {
          question_text: 'Invalid single-option question',
          question_type: 'mcq',
          points: 1,
          option_a: 'Only Option',
          answer: 'A',
        },
      ]);

      expect(() =>
        parseQuestionImportFile({
          buffer: Buffer.from(json, 'utf-8'),
          filename: 'questions.json',
        }),
      ).toThrow('require at least 2 non-blank options');
    });
  });

  describe('TP-ANALYSIS-001 - Question Categorization & Difficulty', () => {
    it('should parse question_category, question_difficulty, and subtopic', () => {
      const json = JSON.stringify([
        {
          question_text: 'Calculate the ground speed given 100kt TAS and 20kt headwind.',
          question_type: 'mcq',
          points: 2,
          topic: 'Navigation',
          question_category: 'calculation',
          question_difficulty: 'hard',
          subtopic: 'Ground Speed',
          option_a: '80 kt',
          option_b: '120 kt',
          answer: 'A',
        },
      ]);

      const result = parseQuestionImportFile({
        buffer: Buffer.from(json, 'utf-8'),
        filename: 'questions.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].topic).toBe('Navigation');
      expect(result[0].question_category).toBe('calculation');
      expect(result[0].question_difficulty).toBe('hard');
      expect(result[0].subtopic).toBe('Ground Speed');
    });

    it('should keep category and difficulty optional (undefined) when omitted', () => {
      const json = JSON.stringify([
        {
          question_text: 'What does VFR stand for?',
          question_type: 'mcq',
          points: 1,
          option_a: 'Visual Flight Rules',
          option_b: 'Very Fast Route',
          answer: 'A',
        },
      ]);

      const result = parseQuestionImportFile({
        buffer: Buffer.from(json, 'utf-8'),
        filename: 'questions.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].question_category).toBeUndefined();
      expect(result[0].question_difficulty).toBeUndefined();
      expect(result[0].subtopic).toBeUndefined();
    });

    it('should support admin custom question category (e.g. technical_general)', () => {
      const json = JSON.stringify([
        {
          question_text: "What is the primary purpose of an aircraft's wings?",
          question_type: 'mcq',
          points: 1,
          topic: 'DGCA/SACAA Technical General',
          question_category: 'technical_general',
          question_difficulty: 'easy',
          subtopic: 'Aircraft Basic Principles',
          option_a: 'To produce lift',
          option_b: 'To produce fuel',
          answer: 'A',
        },
      ]);

      const result = parseQuestionImportFile({
        buffer: Buffer.from(json, 'utf-8'),
        filename: 'questions.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].question_category).toBe('technical_general');
      expect(result[0].question_difficulty).toBe('easy');
      expect(result[0].subtopic).toBe('Aircraft Basic Principles');
    });
  });
});
