"use client";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Heading3, Heading4,
  Minus, Undo, Redo, Loader2,
  Code, Type,
} from 'lucide-react';
import { useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Botón de la barra de herramientas ────────────────────────────────────────
function ToolBtn({
  onClick, active = false, disabled = false, title, children
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg text-xs transition-all flex items-center justify-center
        ${active
          ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/40'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// ── Separador ────────────────────────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-6 bg-zinc-800 mx-1 shrink-0" />;
}

// ── Editor WYSIWYG principal ─────────────────────────────────────────────────
interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder = 'Escribe el contenido aquí...' }: RichEditorProps) {
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList:    { keepMarks: true, keepAttributes: false },
        orderedList:   { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[300px] text-zinc-200',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // ── Subir imagen a Supabase e insertarla en el cursor ───────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploadingImg(true);
    try {
      const ext      = file.name.split('.').pop();
      const fileName = `content/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('posts').upload(fileName, file);
      if (error) { alert('Error subiendo imagen: ' + error.message); return; }
      const url = supabase.storage.from('posts').getPublicUrl(fileName).data.publicUrl;
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } finally { setUploadingImg(false); }
  }, [editor]);

  // ── Insertar link ────────────────────────────────────────────────────────
  const handleLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url  = window.prompt('URL del enlace:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black overflow-hidden focus-within:border-neon-purple/60 transition-all">

      {/* ── BARRA DE HERRAMIENTAS ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 p-3 border-b border-zinc-800 bg-zinc-950/80">

        {/* Deshacer / Rehacer */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
          <Undo className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
          <Redo className="w-3.5 h-3.5" />
        </ToolBtn>

        <Sep />

        {/* Estilos de párrafo */}
        <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Párrafo">
          <Type className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
          <span className="text-[10px] font-black uppercase tracking-tight leading-none">H1</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
          <span className="text-[10px] font-black uppercase tracking-tight leading-none">H2</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
          <span className="text-[10px] font-black uppercase tracking-tight leading-none">H3</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive('heading', { level: 4 })} title="Título 4">
          <span className="text-[10px] font-black uppercase tracking-tight leading-none">H4</span>
        </ToolBtn>

        <Sep />

        {/* Formato de texto */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado (Ctrl+U)">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código en línea">
          <Code className="w-3.5 h-3.5" />
        </ToolBtn>

        <Sep />

        {/* Listas */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista con viñetas">
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita">
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea divisoria">
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>

        <Sep />

        {/* Alineación */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinear izquierda">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrar">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinear derecha">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>

        <Sep />

        {/* Link e imagen */}
        <ToolBtn onClick={handleLink} active={editor.isActive('link')} title="Insertar enlace">
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolBtn>

        <button
          type="button"
          title="Insertar imagen en el contenido"
          onClick={() => imgInputRef.current?.click()}
          disabled={uploadingImg}
          className="p-2 rounded-lg text-xs transition-all flex items-center gap-1.5 text-zinc-400 hover:text-neon-green hover:bg-neon-green/10 border border-transparent hover:border-neon-green/20"
        >
          {uploadingImg
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-neon-green" />
            : <ImageIcon className="w-3.5 h-3.5" />}
          <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
            {uploadingImg ? 'Subiendo...' : 'Insertar imagen'}
          </span>
        </button>
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
        />
      </div>

      {/* ── ÁREA DE ESCRITURA ────────────────────────────────────────── */}
      <div className="p-6 rich-editor-content overflow-y-auto" style={{ maxHeight: '480px' }}>
        <EditorContent editor={editor} />
      </div>

      {/* Contador de palabras */}
      <div className="px-6 pb-3 flex justify-end">
        <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
          {editor.storage.characterCount?.words?.() ?? 0} palabras
        </span>
      </div>
    </div>
  );
}
