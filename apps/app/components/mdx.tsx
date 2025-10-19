import { ArrowUpRight, Coffee } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { highlight } from "sugar-high";
import TurndownService from "turndown";
import { CopyCode } from "./copy-code";
import { ExpandableCode } from "./expandable-code";
import {
  TaskSimulator,
  RaceConditionVisualizer,
  GoroutineScheduler,
  ChannelSimulator,
  UnbufferedChannelDemo,
  RealtimeAudioFlow,
} from "./interactive-components";
import { CodePlayground } from "./interactive-components/code-playground";

function Table({ data }) {
  const headers = data.headers.map((header, index) => (
    <th
      key={index}
      className="border-b border-neutral-200 dark:border-neutral-800
        bg-secondary dark:bg-secondary/50
        px-4 py-2 text-left
        text-sm font-semibold text-secondary-foreground dark:text-secondary-foreground
        first:pl-6 last:pr-6 whitespace-nowrap"
    >
      {header}
    </th>
  ));

  const rows = data.rows.map((row, index) => (
    <tr
      key={index}
      className="group transition-colors hover:bg-muted/50 dark:hover:bg-muted/50 text-start tracking-wide"
    >
      {row.map((cell, cellIndex) => (
        <td
          key={cellIndex}
          className="border-b border-neutral-200 dark:border-neutral-800
            px-4 py-2 text-xs text-muted-foreground
            first:pl-6 last:pr-6"
        >
          {cell}
        </td>
      ))}
    </tr>
  ));

  return (
    <div className="not-prose relative my-4 overflow-hidden rounded-lg border border-border bg-card overflow-x-auto">
      <table className="w-full border-collapse m-0">
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody className="divide-y divide-border">{rows}</tbody>
      </table>
    </div>
  );
}

function CustomLink(props) {
  const href = props.href;

  if (href.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    );
  }

  if (href.startsWith("#")) {
    return <a {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

function RoundedImage(props) {
  return <Image alt={props.alt} className="rounded-lg" {...props} />;
}

function Callout(props) {
  return (
    <div className="my-4 text-xs flex items-start">
      <div className="flex items-center w-4 mr-4">↪</div>
      <div className="w-full callout text-muted-foreground tracking-tight">
        {props.children}
      </div>
    </div>
  );
}

function ProsCard({ title, pros }) {
  return (
    <div
      className="border border-neutral-200 dark:border-neutral-800 
                    bg-white dark:bg-neutral-900 
                    rounded-lg p-6 my-4 w-full"
    >
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
            {title}
          </h4>
        </div>
      )}
      <div className="space-y-2">
        {pros.map((pro, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
            <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {pro}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsCard({ title, cons }) {
  return (
    <div
      className="border border-neutral-200 dark:border-neutral-800 
                    bg-white dark:bg-neutral-900 
                    rounded-lg p-6 my-4 w-full"
    >
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
            {title}
          </h4>
        </div>
      )}
      <div className="space-y-2">
        {cons.map((con, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
            <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {con}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkCardList({ cards }) {
  return (
    <div
      className=" bg-neutral-100 dark:bg-neutral-900 rounded-xl p-6
    my-4 w-full gap-12"
    >
      {cards.map((card) => (
        <LinkCard key={card.title} title={card.title} link={card.link} />
      ))}
    </div>
  );
}

function LinkCard({ title, link }) {
  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline"
    >
      <button className="flex flex-row justify-start items-center w-full cursor-pointer ">
        <div
          className="h-4 w-4
        mr-2"
        >
          <ArrowUpRight size={16} className="text-blue-700" />
        </div>
        <span className="font-medium text-blue-600 ">{title}</span>
      </button>
    </Link>
  );
}

function Code({ children, ...props }) {
  if (typeof children === "string" && !children.includes("\n")) {
    return <code {...props}>{children}</code>;
  }

  const codeHTML = highlight(children);
  const isLongCode = children.split("\n").length > 15;

  const codeBlock = (
    <pre className="!border-none">
      <code dangerouslySetInnerHTML={{ __html: codeHTML }} />
    </pre>
  );

  const wrappedCode = (
    <div className="bg-zinc-50 dark:bg-neutral-950 rounded-lg">
      <CopyCode code={children} className="p-4">
        {codeBlock}
      </CopyCode>
    </div>
  );

  if (isLongCode) {
    return (
      <ExpandableCode className="prose-pre:my-0">{wrappedCode}</ExpandableCode>
    );
  }

  return wrappedCode;
}

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim() // Remove whitespace from both ends of a string
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w-]+/g, "") // Remove all non-word characters except for -
    .replace(/--+/g, "-"); // Replace multiple - with single -
}

function createHeading(level) {
  const Component = ({ children }) => {
    const slug = slugify(children);
    return React.createElement(
      `h${level}`,
      { id: slug },
      [
        React.createElement("a", {
          href: `#${slug}`,
          key: `link-${slug}`,
          className: "anchor",
        }),
      ],
      children
    );
  };
  Component.displayName = `Heading${level}`;
  return Component;
}

interface BuyMeACoffeeProps {
  username: string;
}

export function BuyMeACoffee({ username }: BuyMeACoffeeProps) {
  return (
    <div className="not-prose my-8 flex items-center justify-center">
      <Link
        href={`https://buymeacoffee.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
      >
        <Coffee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <span>Support Content</span>
      </Link>
    </div>
  );
}

const components = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  a: CustomLink,
  Image: RoundedImage,
  Callout,
  ProsCard,
  ConsCard,
  code: Code,
  Table,
  LinkCardList,
  LinkCard,
  BuyMeACoffee,
  TaskSimulator,
  RaceConditionVisualizer,
  GoroutineScheduler,
  ChannelSimulator,
  UnbufferedChannelDemo,
  CodePlayground,
  RealtimeAudioFlow,
};

export function CustomMDX({ source }: { source: string }) {
  // Detect if content is legacy HTML (has HTML-specific attributes or any HTML tags)
  const isLegacyHTML = source.trim().startsWith('<') || /<[a-zA-Z][^>]*>/g.test(source);

  let processedSource = source;

  if (isLegacyHTML) {
    // Pre-process HTML to fix malformed tags
    let cleanedHTML = source;

    // Strategy: Remove ALL emphasis/formatting tags to avoid malformed HTML issues
    // Turndown will handle the conversion with its custom rule
    cleanedHTML = cleanedHTML
      // Remove ALL emphasis tags (both opening and closing, matched or not)
      .replace(/<\/?i\b[^>]*>/gi, '')
      .replace(/<\/?em\b[^>]*>/gi, '')
      .replace(/<\/?b\b[^>]*>/gi, '')
      .replace(/<\/?strong\b[^>]*>/gi, '')
      // Also remove span tags which can cause issues
      .replace(/<\/?span\b[^>]*>/gi, '')
      // Convert <br> to newlines
      .replace(/<br\s*\/?>/gi, '\n');

    // Convert HTML to Markdown using Turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      br: '\n',
    });

    // Add rule to strip out problematic emphasis tags that Turndown can't handle
    turndownService.addRule('removeProblematicEmphasis', {
      filter: ['i', 'em', 'b', 'strong'],
      replacement: function(content) {
        // Just return the content without the tags
        return content;
      }
    });

    // Custom rule for tables - convert to proper GFM tables
    turndownService.addRule('table', {
      filter: 'table',
      replacement: function (content, node) {
        const rows: string[] = [];
        const tableNode = node as HTMLTableElement;

        // Process all rows
        const allRows = Array.from(tableNode.querySelectorAll('tr'));

        allRows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const cellContents = cells.map(cell => {
            const text = cell.textContent?.trim() || '';
            // Escape pipe characters in cell content
            return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
          });

          if (cellContents.length > 0) {
            rows.push('| ' + cellContents.join(' | ') + ' |');

            // Add separator row after header
            if (rowIndex === 0 || row.querySelector('th')) {
              const separator = cells.map(() => '---');
              rows.push('| ' + separator.join(' | ') + ' |');
            }
          }
        });

        return '\n\n' + rows.join('\n') + '\n\n';
      }
    });

    try {
      // Convert HTML to Markdown using cleaned HTML
      processedSource = turndownService.turndown(cleanedHTML);

      // Clean up common MDX issues
      processedSource = processedSource
        // Ensure blank lines around code blocks
        .replace(/(```[\s\S]*?```)/g, '\n\n$1\n\n')
        // Ensure blank lines around tables
        .replace(/(\n\|[^\n]*\|(?:\n\|[^\n]*\|)*)/g, '\n$1\n')
        // Fix multiple blank lines
        .replace(/\n{3,}/g, '\n\n')
        // Trim whitespace
        .trim();
    } catch (error) {
      console.error('Error converting HTML to Markdown:', error);
      // Fall back to original source
      processedSource = source;
    }
  }

  // Final cleanup: Fix any problematic MDX syntax
  processedSource = processedSource
    .split('\n')
    .map((line, index, lines) => {
      const trimmedLine = line.trim();

      // Preserve code blocks
      if (trimmedLine.startsWith('```')) {
        return line;
      }

      // If line is a table row, keep it but ensure proper formatting
      if (trimmedLine.startsWith('|')) {
        // Ensure table row has proper structure
        if (!trimmedLine.endsWith('|')) {
          return line + ' |';
        }
        return line;
      }

      // For non-table rows, escape problematic characters
      let processedLine = line;

      // Escape pipe characters (not in tables)
      processedLine = processedLine.replace(/\|/g, '&#124;');

      // Escape curly braces that aren't valid JSX expressions
      // Only escape if it looks like incorrect JSX syntax
      processedLine = processedLine.replace(/\{(?![a-zA-Z_$])/g, '&#123;');
      processedLine = processedLine.replace(/(?<![a-zA-Z0-9_$])\}/g, '&#125;');

      // Escape angle brackets that aren't part of HTML tags
      // Keep <Component> but escape < when followed by space or special chars
      processedLine = processedLine.replace(/<(?!\/?[a-zA-Z][a-zA-Z0-9]*[\s>])/g, '&lt;');
      processedLine = processedLine.replace(/(?<!<[a-zA-Z0-9\s="'\-/]*)>(?![^<]*<\/[a-zA-Z])/g, '&gt;');

      return processedLine;
    })
    .join('\n');

  // Additional safety: remove any remaining MDX expressions that might be malformed
  // MDX expressions are {expression} - if they're not valid JS, escape them
  processedSource = processedSource.replace(/\{[^}]*\}/g, (match) => {
    // If it looks like a valid JSX expression, keep it
    if (match.match(/^\{[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*\}$/)) {
      return match;
    }
    // Otherwise, escape the braces
    return match.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
  });

  // Wrap in try-catch to handle MDX compilation errors gracefully
  try {
    return <MDXRemote source={processedSource} components={components} />;
  } catch (error) {
    console.error('MDX compilation error:', error);
    // Log the problematic source for debugging
    console.error('Problematic source (first 1000 chars):', processedSource?.substring(0, 1000));

    // Try to find the problematic line
    const errorMessage = String(error);
    const lineMatch = errorMessage.match(/line (\d+)/i);
    if (lineMatch) {
      const lineNum = parseInt(lineMatch[1]);
      const lines = processedSource.split('\n');
      console.error(`Problematic line ${lineNum}:`, lines[lineNum - 1]);
    }

    return (
      <div className="prose dark:prose-invert max-w-none">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error rendering content</p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">
            This content could not be displayed due to a formatting error.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
                Show error details
              </summary>
              <pre className="mt-2 text-xs overflow-auto">
                {String(error)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
