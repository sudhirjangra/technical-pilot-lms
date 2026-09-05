'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@repo/shadcn/lib/utils';
import { Button } from '@repo/shadcn/button';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
} from '@repo/shadcn/lucide';
import './tiptap.css';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  className?: string;
  minHeight?: string;
  editable?: boolean;
}

export function RichTextEditor({
  value = '',
  onChange,
  className,
  minHeight = 'min-h-[160px]',
  editable = true,
}: RichTextEditorProps) {
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-outside ml-4 space-y-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-outside ml-4 space-y-1',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-primary/40 pl-3 italic text-muted-foreground',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary',
          },
        },
      }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80 cursor-pointer',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn('prose prose-sm dark:prose-invert focus:outline-none w-full max-w-none p-3', minHeight),
      },
    },
    onUpdate: ({ editor }) => {
      isUpdatingRef.current = true;
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }
    const currentHTML = editor.getHTML();
    if (value !== currentHTML && (value || currentHTML !== '<p></p>')) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn('relative w-full rounded-md border border-input bg-card overflow-hidden', className)}>
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/30 p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('underline') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('strike') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </Button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('heading', { level: 2 }) && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('heading', { level: 3 }) && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </Button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('bulletList') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('orderedList') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('blockquote') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', editor.isActive('codeBlock') && 'bg-muted text-primary')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code className="size-3.5" />
          </Button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="size-3.5" />
          </Button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn('w-full cursor-text no-scrollbar', minHeight)}
      />
    </div>
  );
}
