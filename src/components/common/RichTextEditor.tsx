import React, { useState, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  minHeight?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = '', 
  disabled = false,
  error,
  minHeight = '200px'
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '', placeholderText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = selectedText || placeholderText;
    
    const newValue = 
      value.substring(0, start) + 
      before + newText + after + 
      value.substring(end);
    
    onChange(newValue);
    
    textarea.focus();
    const newCursorPos = start + before.length + newText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    label: string;
    children: React.ReactNode;
  }> = ({ onClick, label, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={label}
    >
      {children}
    </button>
  );

  return (
    <div className={`border rounded-md overflow-hidden ${error ? 'border-red-300' : 'border-gray-300'}`}>
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap gap-1">
        {!isPreview && (
          <>
            <ToolbarButton onClick={() => insertText('**', '**', 'bold text')} label="Bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6v-8zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('*', '*', 'italic text')} label="Italic">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('~~', '~~', 'strikethrough')} label="Strikethrough">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 12H7m10-4a4 4 0 00-8 0m8 8a4 4 0 01-8 0" />
              </svg>
            </ToolbarButton>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <ToolbarButton onClick={() => insertText('# ', '', 'Heading 1')} label="Heading 1">
              <span className="font-bold text-sm">H1</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('## ', '', 'Heading 2')} label="Heading 2">
              <span className="font-bold text-sm">H2</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('### ', '', 'Heading 3')} label="Heading 3">
              <span className="font-bold text-sm">H3</span>
            </ToolbarButton>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <ToolbarButton onClick={() => insertText('- ', '', 'List item')} label="Bullet List">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('1. ', '', 'Numbered item')} label="Numbered List">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h14M7 12h14M7 4h14M3 20h.01M3 12h.01M3 4h.01" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('- [ ] ', '', 'Task item')} label="Task List">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ToolbarButton>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <ToolbarButton 
              onClick={() => insertText('[', '](url)', 'link text')} 
              label="Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => insertText('`', '`', 'code')} 
              label="Inline Code"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => insertText('```\n', '\n```', 'code block')} 
              label="Code Block"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('> ', '', 'quote')} label="Blockquote">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </ToolbarButton>
            
            <div className="w-px bg-gray-300 mx-1" />
            
            <ToolbarButton 
              onClick={() => {
                const tableMarkdown = 
                  '| Column 1 | Column 2 | Column 3 |\n' +
                  '|----------|----------|----------|\n' +
                  '| Cell 1   | Cell 2   | Cell 3   |\n' +
                  '| Cell 4   | Cell 5   | Cell 6   |';
                onChange(value + '\n\n' + tableMarkdown);
              }} 
              label="Table"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </ToolbarButton>
          </>
        )}
        
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          disabled={disabled}
          className="ml-auto px-3 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPreview ? t('forms:buttons.edit', { defaultValue: 'Edit' }) : t('forms:buttons.preview', { defaultValue: 'Preview' })}
        </button>
      </div>
      
      {!isPreview ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 text-gray-700 focus:outline-none resize-none font-mono text-sm"
          style={{ minHeight }}
        />
      ) : (
        <div className="p-3 bg-gray-50 min-h-[200px] prose prose-sm max-w-none">
          <MarkdownContent content={value} />
        </div>
      )}
      
      {error && (
        <p className="px-3 py-1 text-sm text-red-600 bg-red-50">{error}</p>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  if (!content.trim()) {
    return <p className="text-gray-400 italic">{content || 'Empty content'}</p>;
  }
  
  return (
    <div className="whitespace-pre-wrap">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-xl font-bold mb-2 mt-4">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-bold mb-2 mt-3">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-base font-bold mb-2 mt-2">{line.substring(4)}</h3>;
        }
        if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
          const checked = line.startsWith('- [x] ');
          return (
            <div key={i} className="flex items-start mt-1">
              <input type="checkbox" checked={checked} readOnly className="mt-1 mr-2" />
              <span className={checked ? 'line-through text-gray-500' : ''}>{line.substring(6)}</span>
            </div>
          );
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4 mt-1">{line.substring(2)}</li>;
        }
        if (/^\d+\. /.test(line)) {
          return <li key={i} className="ml-4 mt-1 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={i} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">{line.substring(2)}</blockquote>;
        }
        if (line.startsWith('```')) {
          return <pre key={i} className="bg-gray-800 text-gray-100 p-2 rounded my-2 overflow-x-auto"><code>{line.substring(3)}</code></pre>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} className="my-1">{line}</p>;
      })}
    </div>
  );
}
