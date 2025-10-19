import fs from "fs";
import path from "path";

type Metadata = {
  title: string;
  publishedAt: string;
  summary: string;
  keywords: string[];
  image?: string;
};

function parseFrontmatter(fileContent: string) {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  const match = frontmatterRegex.exec(fileContent);
  const frontMatterBlock = match?.[1];
  if (!frontMatterBlock) {
    throw new Error("No frontmatter found");
  }
  const content = fileContent.replace(frontmatterRegex, "").trim();
  const frontMatterLines = frontMatterBlock.trim().split("\n");
  const metadata: Partial<Metadata> = {};

  frontMatterLines.forEach((line) => {
    const [key, ...valueArr] = line.split(": ");
    let value = valueArr.join(": ").trim();
    value = value.replace(/^['"](.*)['"]$/, "$1"); // Remove quotes
    if (key.trim() === "keywords") {
      (metadata as Metadata)[key.trim()] = value
        .split(",")
        .map((k) => k.trim());
    } else {
      (metadata as Metadata)[key.trim()] = value;
    }
  });

  return { metadata: metadata as Metadata, content };
}

function getMDXFiles(dir) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === ".mdx");
}

function readMDXFile(filePath) {
  const rawContent = fs.readFileSync(filePath, "utf-8");
  return parseFrontmatter(rawContent);
}

function getReadingTime(content) {
  const wordsPerMinute = 200; // Average reading speed
  const imageReadingTime = 12; // Estimated reading time for an image
  const punctuationReadingTime = 0.05; // Estimated reading time for punctuation

  const wordCount = content.split(" ").length;
  const imageCount = (content.match(/<img /g) || []).length;
  const punctuationCount = (content.match(/[.,:;]/g) || []).length;

  const readingTime =
    wordCount / wordsPerMinute +
    imageCount * imageReadingTime +
    punctuationCount * punctuationReadingTime;

  return Math.ceil(readingTime);
}

function getMDXData(dir) {
  const mdxFiles = getMDXFiles(dir);
  return mdxFiles.map((file) => {
    const { metadata, content } = readMDXFile(path.join(dir, file));
    const slug = path.basename(file, path.extname(file));
    const readingTime = getReadingTime(content);
    return {
      metadata,
      slug,
      content,
      readingTime,
      like_count: 0,
      comment_count: 0,
      tags: '',
    };
  });
}

export function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), "content")).sort((a, b) => {
    return new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime();
  });
}
