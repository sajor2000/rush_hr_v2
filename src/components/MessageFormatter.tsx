import React from 'react';

interface MessageFormatterProps {
  content: string;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({ content }) => {
  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  const formatParagraph = (paragraph: string, index: number) => {
    // Check if it's a bullet point or numbered list
    if (paragraph.match(/^[-•*]\s/) || paragraph.match(/^\d+\.\s/)) {
      const lines = paragraph.split('\n');
      return (
        <ul key={index} className="list-disc list-inside space-y-1 my-3 ml-2">
          {lines.map((line, i) => {
            const cleanLine = line.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '');
            return <li key={i} className="text-gray-700">{formatInlineElements(cleanLine)}</li>;
          })}
        </ul>
      );
    }
    
    // Check if it's a heading (starts with capital letters and ends with :)
    if (paragraph.match(/^[A-Z][^.!?]*:$/)) {
      return (
        <h4 key={index} className="font-semibold text-gray-900 mt-4 mb-2">
          {paragraph}
        </h4>
      );
    }
    
    // Regular paragraph
    return (
      <p key={index} className="text-gray-700 leading-relaxed mb-3">
        {formatInlineElements(paragraph)}
      </p>
    );
  };
  
  const formatInlineElements = (text: string) => {
    // Replace **bold** with strong tags
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Replace *italic* with em tags
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace `code` with code tags
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Replace quotes
    formatted = formatted.replace(/"([^"]+)"/g, '"$1"');
    
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };
  
  return (
    <div className="prose prose-sm max-w-none">
      {paragraphs.map((paragraph, index) => formatParagraph(paragraph, index))}
    </div>
  );
};