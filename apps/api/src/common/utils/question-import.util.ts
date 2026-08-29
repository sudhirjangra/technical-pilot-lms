import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import * as XLSX from 'xlsx';

export type QuizQuestionType = 'mcq' | 'msq' | 'text';

export type QuizQuestionOptionInput = {
  option_text: string;
  is_correct: boolean;
};

export type ImportedQuizQuestion = {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  explanation?: string;
  sort_order: number;
  options: QuizQuestionOptionInput[];
};

type QuestionImportFile = {
  buffer: Buffer;
  filename?: string;
  mimetype?: string;
};

type SheetRow = {
  question_number?: unknown;
  question_text?: unknown;
  question_type?: unknown;
  points?: unknown;
  explanation?: unknown;
  option_text?: unknown;
  is_correct?: unknown;
};

function getFileExtension(filename?: string): string {
  return extname(filename ?? '').toLowerCase();
}

function normalizeRequiredText(
  value: unknown,
  field: string,
  context: string,
): string {
  const normalized =
    typeof value === 'string' ? value.trim() : String(value ?? '').trim();

  if (normalized.length === 0) {
    throw new BadRequestException(`${context}: ${field} is required`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return String(value).trim() || undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeQuestionType(
  value: unknown,
  context: string,
): QuizQuestionType {
  const normalized = normalizeRequiredText(
    value,
    'question_type',
    context,
  ).toLowerCase();

  if (normalized !== 'mcq' && normalized !== 'msq' && normalized !== 'text') {
    throw new BadRequestException(
      `${context}: question_type must be one of mcq, msq, text`,
    );
  }

  return normalized;
}

function normalizePoints(value: unknown, context: string): number {
  if (value === null || value === undefined || value === '') return 1;

  const points =
    typeof value === 'number' ? value : Number(String(value).trim());

  if (!Number.isInteger(points) || points < 1) {
    throw new BadRequestException(
      `${context}: points must be an integer greater than or equal to 1`,
    );
  }

  return points;
}

function normalizeBoolean(value: unknown, context: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }

  throw new BadRequestException(
    `${context}: is_correct must be true, false, 1, 0, yes, or no`,
  );
}

export function normalizeQuestionOptions(
  options:
    | Array<{ option_text: unknown; is_correct: unknown }>
    | undefined,
  context: string,
): QuizQuestionOptionInput[] {
  return (options ?? []).map((option, index) => {
    return {
      option_text: normalizeRequiredText(
      option.option_text,
      'option_text',
      `${context} option ${index + 1}`,
      ),
      is_correct: normalizeBoolean(
        option.is_correct,
        `${context} option ${index + 1}`,
      ),
    };
  });
}

export function validateQuestionOptions(
  questionType: QuizQuestionType,
  options: QuizQuestionOptionInput[],
  context: string,
) {
  if (questionType === 'text') {
    if (options.length > 0) {
      throw new BadRequestException(
        `${context}: text questions cannot have options`,
      );
    }
    return;
  }

  if (options.length < 2) {
    throw new BadRequestException(
      `${context}: ${questionType} questions must have at least 2 options`,
    );
  }

  const correctCount = options.filter((option) => option.is_correct).length;

  if (questionType === 'mcq' && correctCount !== 1) {
    throw new BadRequestException(
      `${context}: mcq questions must have exactly 1 correct option`,
    );
  }

  if (questionType === 'msq' && correctCount < 1) {
    throw new BadRequestException(
      `${context}: msq questions must have at least 1 correct option`,
    );
  }
}

function parseJsonQuestions(buffer: Buffer): ImportedQuizQuestion[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(buffer.toString('utf-8'));
  } catch {
    throw new BadRequestException('Invalid JSON file');
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestException('JSON import must be an array of questions');
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new BadRequestException(`Question ${index + 1}: invalid payload`);
    }

    const question = item as Record<string, unknown>;
    const context = `Question ${index + 1}`;
    const questionType = normalizeQuestionType(
      question.question_type,
      context,
    );
    const options = normalizeQuestionOptions(
      Array.isArray(question.options)
        ? (question.options as Array<{ option_text: unknown; is_correct: unknown }>)
        : undefined,
      context,
    );

    validateQuestionOptions(questionType, options, context);

    return {
      question_text: normalizeRequiredText(
        question.question_text,
        'question_text',
        context,
      ),
      question_type: questionType,
      points: normalizePoints(question.points, context),
      explanation: normalizeOptionalText(question.explanation),
      sort_order: index + 1,
      options,
    };
  });
}

function parseSheetQuestions(buffer: Buffer): ImportedQuizQuestion[] {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new BadRequestException('Invalid spreadsheet file');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException('Import file is empty');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    defval: '',
  });

  if (rows.length === 0) {
    throw new BadRequestException('Import file is empty');
  }

  const groupedQuestions = new Map<
    string,
    ImportedQuizQuestion & { rowNumber: number }
  >();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const questionNumber = normalizeRequiredText(
      row.question_number,
      'question_number',
      `Row ${rowNumber}`,
    );

    const existing = groupedQuestions.get(questionNumber);
    if (!existing) {
      const context = `Row ${rowNumber}`;
      const questionType = normalizeQuestionType(row.question_type, context);
      const question: ImportedQuizQuestion & { rowNumber: number } = {
        question_text: normalizeRequiredText(
          row.question_text,
          'question_text',
          context,
        ),
        question_type: questionType,
        points: normalizePoints(row.points, context),
        explanation: normalizeOptionalText(row.explanation),
        sort_order: groupedQuestions.size + 1,
        options: [],
        rowNumber,
      };

      groupedQuestions.set(questionNumber, question);
    } else {
      const questionText = normalizeRequiredText(
        row.question_text,
        'question_text',
        `Row ${rowNumber}`,
      );
      const questionType = normalizeQuestionType(
        row.question_type,
        `Row ${rowNumber}`,
      );
      const points = normalizePoints(row.points, `Row ${rowNumber}`);
      const explanation = normalizeOptionalText(row.explanation);

      if (existing.question_text !== questionText) {
        throw new BadRequestException(
          `Row ${rowNumber}: question_text does not match earlier rows for question_number ${questionNumber}`,
        );
      }

      if (existing.question_type !== questionType) {
        throw new BadRequestException(
          `Row ${rowNumber}: question_type does not match earlier rows for question_number ${questionNumber}`,
        );
      }

      if (existing.points !== points) {
        throw new BadRequestException(
          `Row ${rowNumber}: points does not match earlier rows for question_number ${questionNumber}`,
        );
      }

      if ((existing.explanation ?? '') !== (explanation ?? '')) {
        throw new BadRequestException(
          `Row ${rowNumber}: explanation does not match earlier rows for question_number ${questionNumber}`,
        );
      }
    }

    const question = groupedQuestions.get(questionNumber)!;
    const optionText = normalizeOptionalText(row.option_text);
    const hasIsCorrectValue = normalizeOptionalText(row.is_correct) !== undefined;

    if (question.question_type === 'text') {
      if (optionText || hasIsCorrectValue) {
        throw new BadRequestException(
          `Row ${rowNumber}: text questions cannot have options`,
        );
      }
      return;
    }

    if (!optionText) {
      throw new BadRequestException(
        `Row ${rowNumber}: option_text is required for ${question.question_type} questions`,
      );
    }

    if (!hasIsCorrectValue) {
      throw new BadRequestException(`Row ${rowNumber}: is_correct is required`);
    }

    question.options.push({
      option_text: optionText,
      is_correct: normalizeBoolean(row.is_correct, `Row ${rowNumber}`),
    });
  });

  const questions = Array.from(groupedQuestions.entries()).map(
    ([questionNumber, question]) => {
      validateQuestionOptions(
        question.question_type,
        question.options,
        `Question ${questionNumber}`,
      );

      return {
        question_text: question.question_text,
        question_type: question.question_type,
        points: question.points,
        explanation: question.explanation,
        sort_order: question.sort_order,
        options: question.options,
      };
    },
  );

  return questions;
}

export function parseQuestionImportFile({
  buffer,
  filename,
  mimetype,
}: QuestionImportFile): ImportedQuizQuestion[] {
  const extension = getFileExtension(filename);

  if (extension === '.json' || mimetype === 'application/json') {
    return parseJsonQuestions(buffer);
  }

  if (
    extension === '.csv' ||
    extension === '.xlsx' ||
    mimetype === 'text/csv' ||
    mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel'
  ) {
    return parseSheetQuestions(buffer);
  }

  throw new BadRequestException(
    'Unsupported file type. Please upload a .csv, .json, or .xlsx file',
  );
}
