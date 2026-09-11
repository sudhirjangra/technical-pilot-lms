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
});
