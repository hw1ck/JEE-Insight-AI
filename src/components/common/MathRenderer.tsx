import React from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  showDiagramNoticeIfReferenced?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  className = '',
  style,
  showDiagramNoticeIfReferenced = true
}) => {
  if (!text) return null;

  // Check if diagram or figure is referenced in text
  const mentionsDiagram =
    showDiagramNoticeIfReferenced &&
    /(given in (the )?(figure|diagram|circuit)|shown in (the )?(figure|diagram|circuit)|refer to (the )?(figure|diagram)|as per (the )?(diagram|figure))/i.test(text);

  // Helper to format LaTeX math fragments into clean, readable notation
  const formatMathString = (raw: string): string => {
    let s = raw;

    // Handle delimiters: \( ... \), \[ ... \], $ ... $
    s = s.replace(/\\\((.*?)\\\)/g, '$1');
    s = s.replace(/\\\[(.*?)\\\]/g, '$1');

    // Vectors
    s = s.replace(/\\hat\{\\mathbf\{i\}\}/g, 'î');
    s = s.replace(/\\hat\{\\mathbf\{j\}\}/g, 'ĵ');
    s = s.replace(/\\hat\{\\mathbf\{k\}\}/g, 'k̂');
    s = s.replace(/\\vec\{([a-zA-Z])\}/g, '$1⃗');
    s = s.replace(/\\overrightarrow\{([a-zA-Z]+)\}/g, '$1⃗');

    // Fractions: \frac{a}{b} -> (a / b)
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)'); // second pass for nested

    // Square roots: \sqrt{x} -> √(x)
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

    // Common Greek letters
    s = s.replace(/\\alpha/g, 'α');
    s = s.replace(/\\beta/g, 'β');
    s = s.replace(/\\gamma/g, 'γ');
    s = s.replace(/\\delta/g, 'δ');
    s = s.replace(/\\Delta/g, 'Δ');
    s = s.replace(/\\theta/g, 'θ');
    s = s.replace(/\\lambda/g, 'λ');
    s = s.replace(/\\mu/g, 'μ');
    s = s.replace(/\\pi/g, 'π');
    s = s.replace(/\\omega/g, 'ω');
    s = s.replace(/\\Omega/g, 'Ω');
    s = s.replace(/\\sigma/g, 'σ');
    s = s.replace(/\\phi/g, 'φ');
    s = s.replace(/\\epsilon/g, 'ε');

    // Operators & Relations
    s = s.replace(/\\times/g, '×');
    s = s.replace(/\\cdot/g, '·');
    s = s.replace(/\\pm/g, '±');
    s = s.replace(/\\mp/g, '∓');
    s = s.replace(/\\le(q)?/g, '≤');
    s = s.replace(/\\ge(q)?/g, '≥');
    s = s.replace(/\\neq/g, '≠');
    s = s.replace(/\\approx/g, '≈');
    s = s.replace(/\\infty/g, '∞');
    s = s.replace(/\\int/g, '∫');
    s = s.replace(/\\sum/g, '∑');
    s = s.replace(/\\to/g, '→');
    s = s.replace(/\\rightarrow/g, '→');
    s = s.replace(/\\leftarrow/g, '←');
    s = s.replace(/\\Rightarrow/g, '⇒');
    s = s.replace(/\\in/g, '∈');
    s = s.replace(/\\notin/g, '∉');
    s = s.replace(/\\subset/g, '⊂');
    s = s.replace(/\\cup/g, '∪');
    s = s.replace(/\\cap/g, '∩');

    // Standard Math Functions
    s = s.replace(/\\log_e/g, 'ln');
    s = s.replace(/\\log_\{([^{}]+)\}/g, 'log_$1');
    s = s.replace(/\\sin/g, 'sin');
    s = s.replace(/\\cos/g, 'cos');
    s = s.replace(/\\tan/g, 'tan');
    s = s.replace(/\\cot/g, 'cot');
    s = s.replace(/\\sec/g, 'sec');
    s = s.replace(/\\csc/g, 'csc');
    s = s.replace(/\\tan\^\{-1\}/g, 'arctan');
    s = s.replace(/\\sin\^\{-1\}/g, 'arcsin');
    s = s.replace(/\\cos\^\{-1\}/g, 'arccos');
    s = s.replace(/\\operatorname\{adj\}/g, 'adj');
    s = s.replace(/\\operatorname\{([a-zA-Z]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\text\{([^{}]+)\}/g, '$1');

    // Superscripts & Subscripts cleanup
    s = s.replace(/\^2/g, '²');
    s = s.replace(/\^3/g, '³');
    s = s.replace(/\^0/g, '⁰');
    s = s.replace(/\^1/g, '¹');
    s = s.replace(/\^4/g, '⁴');
    s = s.replace(/\^\{-1\}/g, '⁻¹');
    s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');
    s = s.replace(/_\{([^{}]+)\}/g, '_($1)');

    // Strip stray unescaped backslashes before plain words
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');

    return s;
  };

  const formattedText = formatMathString(text);

  return (
    <div className={`math-content ${className}`} style={{ ...style, lineHeight: 1.6 }}>
      <span>{formattedText}</span>
      {mentionsDiagram && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '14px' }}>📐</span>
          <span>
            <em>Diagram Reference:</em> Question parameters are algebraically self-contained above. Official geometric diagram asset is from NTA archival session.
          </span>
        </div>
      )}
    </div>
  );
};
