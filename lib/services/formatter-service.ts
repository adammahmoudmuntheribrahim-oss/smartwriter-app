export interface FormatterOptions {
  includeImage?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  includeTableOfContents?: boolean;
}

class FormatterService {
  private static instance: FormatterService;

  private constructor() {}

  static getInstance(): FormatterService {
    if (!FormatterService.instance) {
      FormatterService.instance = new FormatterService();
    }
    return FormatterService.instance;
  }

  formatToHtml(title: string, content: string, options: FormatterOptions = {}): string {
    let html = `<div class="smartwriter-article">`;

    // Add Title
    html += `<h1>${title}</h1>`;

    // Add Featured Image
    if (options.includeImage && options.imageUrl) {
      html += `
        <div class="featured-image" style="margin-bottom: 20px;">
          <img src="${options.imageUrl}" alt="${options.imageAlt || title}" style="width: 100%; height: auto; border-radius: 8px;" />
        </div>
      `;
    }

    // Convert Markdown-like content to HTML
    const lines = content.split('\n');
    let inList = false;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${trimmedLine.substring(4)}</h3>`;
      } else if (trimmedLine.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2>${trimmedLine.substring(3)}</h2>`;
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${trimmedLine.substring(2)}</li>`;
      } else if (trimmedLine.length > 0) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p>${trimmedLine}</p>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
      }
    });

    if (inList) html += '</ul>';

    html += `</div>`;
    return html;
  }
}

export const formatterService = FormatterService.getInstance();
