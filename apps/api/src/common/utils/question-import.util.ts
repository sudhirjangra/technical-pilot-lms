import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import * as XLSX from 'xlsx';

export type QuizQuestionType = 'mcq' | 'msq' | 'text';

export type QuizQuestionOptionInput = {
  option_text: string;
  is_correct: boolean;
};

export type ImportedQuizQuestion = {
  question_number: number;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  explanation?: string;
  topic?: string;
  correct_text_answer: string | null;
  sort_order: number;
  options: QuizQuestionOptionInput[];
};

type QuestionImportFile = {
  buffer: Buffer;
  filename?: string;
  mimetype?: string;
};

type RawRow = Record<string, unknown>;

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
type OptionLetter = (typeof OPTION_LETTERS)[number];

function getFileExtension(filename?: string): string {
  return extname(filename ?? '').toLowerCase();
}

/**
 * Header keys are normalised so `Option A`, `option_a` and `optionA` all map to
 * the same canonical key: lowercase with every non-alphanumeric character
 * removed (`question number` -> `questionnumber`).
 */
function canonicalKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeRow(row: RawRow): RawRow {
  const normalized: RawRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[canonicalKey(key)] = value;
  }
  return normalized;
}

function readCell(row: RawRow, key: string): unknown {
  return row[canonicalKey(key)];
}

function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

function normalizeRequiredText(
  value: unknown,
  field: string,
  context: string,
): string {
  const normalized = toTrimmedString(value);

  if (normalized.length === 0) {
    throw new BadRequestException(`${context}: ${field} is required`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | undefined {
  const trimmed = toTrimmedString(value);
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
      `${context}: question_type must be one of mcq, msq, text (received "${normalized}")`,
    );
  }

  return normalized;
}

function normalizePoints(value: unknown, context: string): number {
  const raw = toTrimmedString(value);
  if (raw.length === 0) return 1;

  const points = Number(raw);

  if (!Number.isInteger(points) || points < 1) {
    throw new BadRequestException(
      `${context}: points must be a positive integer (received "${raw}")`,
    );
  }

  return points;
}

function normalizeQuestionNumber(
  value: unknown,
  context: string,
): number | undefined {
  const raw = toTrimmedString(value);
  if (raw.length === 0) return undefined;

  const questionNumber = Number(raw);
  if (!Number.isInteger(questionNumber) || questionNumber < 1) {
    throw new BadRequestException(
      `${context}: question_number must be a positive integer (received "${raw}")`,
    );
  }

  return questionNumber;
}

/** Splits an msq answer cell on comma, semicolon, slash, pipe or whitespace. */
function splitAnswerLetters(answer: string): string[] {
  return answer
    .split(/[,;/|\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function buildOptions(
  row: RawRow,
  questionType: 'mcq' | 'msq',
  context: string,
): QuizQuestionOptionInput[] {
  const present = new Map<OptionLetter, string>();

  for (const letter of OPTION_LETTERS) {
    const text = normalizeOptionalText(readCell(row, `option_${letter}`));
    if (text) present.set(letter, text);
  }

  if (present.size < 2) {
    throw new BadRequestException(
      `${context}: ${questionType} questions require at least 2 non-blank options (option_A, option_B, ...)`,
    );
  }

  const answer = normalizeRequiredText(
    readCell(row, 'answer'),
    'answer',
    context,
  );
  const letters = splitAnswerLetters(answer).map((part) => part.toUpperCase());

  if (letters.length === 0) {
    throw new BadRequestException(`${context}: answer is required`);
  }

  if (questionType === 'mcq' && letters.length !== 1) {
    throw new BadRequestException(
      `${context}: answer for an mcq question must be exactly one option letter (A-D), received "${answer}"`,
    );
  }

  const correct = new Set<OptionLetter>();
  for (const letter of letters) {
    if (!OPTION_LETTERS.includes(letter as OptionLetter)) {
      throw new BadRequestException(
        `${context}: answer contains "${letter}" which is not a valid option letter (A, B, C or D)`,
      );
    }
    const optionLetter = letter as OptionLetter;
    if (!present.has(optionLetter)) {
      throw new BadRequestException(
        `${context}: answer refers to option ${optionLetter} but column option_${optionLetter} is blank`,
      );
    }
    correct.add(optionLetter);
  }

  return OPTION_LETTERS.filter((letter) => present.has(letter)).map(
    (letter) => ({
      option_text: present.get(letter) as string,
      is_correct: correct.has(letter),
    }),
  );
}

type ParsedRow = {
  questionNumber?: number;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  explanation?: string;
  topic?: string;
  correct_text_answer: string | null;
  options: QuizQuestionOptionInput[];
};

function parseQuestionRow(row: RawRow, context: string): ParsedRow {
  const questionType = normalizeQuestionType(
    readCell(row, 'question_type'),
    context,
  );
  const questionText = normalizeRequiredText(
    readCell(row, 'question_text'),
    'question_text',
    context,
  );
  const questionNumber = normalizeQuestionNumber(
    readCell(row, 'question_number'),
    context,
  );
  const points = normalizePoints(readCell(row, 'points'), context);
  const explanation = normalizeOptionalText(readCell(row, 'explanation'));
  const topic = normalizeOptionalText(readCell(row, 'topic'));

  if (questionType === 'text') {
    for (const letter of OPTION_LETTERS) {
      if (normalizeOptionalText(readCell(row, `option_${letter}`))) {
        throw new BadRequestException(
          `${context}: text questions must leave option_${letter} blank`,
        );
      }
    }

    return {
      questionNumber,
      question_text: questionText,
      question_type: questionType,
      points,
      explanation,
      topic,
      correct_text_answer: normalizeRequiredText(
        readCell(row, 'answer'),
        'answer',
        context,
      ),
      options: [],
    };
  }

  return {
    questionNumber,
    question_text: questionText,
    question_type: questionType,
    points,
    explanation,
    topic,
    correct_text_answer: null,
    options: buildOptions(row, questionType, context),
  };
}

/**
 * `question_number` is optional but, when supplied, must be unique across the
 * whole file. It drives both `question_number` and `sort_order`. When omitted
 * we fall back to file order (1..n).
 */
function finalizeQuestions(
  parsed: ParsedRow[],
  contexts: string[],
): ImportedQuizQuestion[] {
  const seen = new Map<number, string>();

  parsed.forEach((question, index) => {
    if (question.questionNumber === undefined) return;
    const previous = seen.get(question.questionNumber);
    if (previous) {
      throw new BadRequestException(
        `${contexts[index]}: duplicate question_number ${question.questionNumber} (already used by ${previous})`,
      );
    }
    seen.set(question.questionNumber, contexts[index]);
  });

  return parsed.map((question, index) => {
    const number = question.questionNumber ?? index + 1;
    return {
      question_number: number,
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      explanation: question.explanation,
      topic: question.topic,
      correct_text_answer: question.correct_text_answer,
      sort_order: number,
      options: question.options,
    };
  });
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

  if (parsed.length === 0) {
    throw new BadRequestException('Import file is empty');
  }

  const contexts: string[] = [];
  const rows = parsed.map((item, index) => {
    const context = `Question ${index + 1}`;
    contexts.push(context);

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new BadRequestException(
        `${context}: each entry must be an object with the import template keys`,
      );
    }

    return parseQuestionRow(normalizeRow(item as RawRow), context);
  });

  return finalizeQuestions(rows, contexts);
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
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });

  const contexts: string[] = [];
  const rows: ParsedRow[] = [];

  rawRows.forEach((rawRow, index) => {
    const normalized = normalizeRow(rawRow);
    const isBlank = Object.values(normalized).every(
      (value) => toTrimmedString(value).length === 0,
    );
    if (isBlank) return;

    // +2 because row 1 of the template is the header row.
    const context = `Row ${index + 2}`;
    contexts.push(context);
    rows.push(parseQuestionRow(normalized, context));
  });

  if (rows.length === 0) {
    throw new BadRequestException('Import file is empty');
  }

  return finalizeQuestions(rows, contexts);
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
  options: Array<{ option_text: unknown; is_correct: unknown }> | undefined,
  context: string,
): QuizQuestionOptionInput[] {
  return (options ?? []).map((option, index) => ({
    option_text: normalizeRequiredText(
      option.option_text,
      'option_text',
      `${context} option ${index + 1}`,
    ),
    is_correct: normalizeBoolean(
      option.is_correct,
      `${context} option ${index + 1}`,
    ),
  }));
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
