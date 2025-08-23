export interface CategoryData {
  code: string;
  creator: string;
  title: string;
  words: string;
  played: string;
  highScore: string;
  highScoreUser: string;
  timestamp: string;
}

export const parseCategoryString = (categoryString: string): CategoryData => {
  const parts = categoryString.split(":");

  return {
    code: parts[0] || "",
    creator: parts[1] || "",
    title: parts[2] || "Unknown",
    words: parts[9] || "",
    played: parts[3] || "0",
    highScore: parts[4] || "0",
    highScoreUser: parts[5] || "",
    timestamp: parts[8] || "0",
  };
};

export const formatRelativeTime = (timestamp: string) => {
  if (!timestamp || isNaN(parseInt(timestamp))) {
    return "";
  }

  try {
    const now = new Date();

    const diffMs = now.getTime() - parseInt(timestamp) * 1000;

    if (diffMs < 60000) {
      return "now";
    }

    if (diffMs < 3600000) {
      const diffMinutes = Math.floor(diffMs / 60000);
      return `${diffMinutes}min`;
    }

    if (diffMs < 86400000) {
      const diffHours = Math.floor(diffMs / 3600000);
      return `${diffHours}h`;
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "1d";
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}mo`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}y`;
    }
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "message" in e &&
      e.message === "ServerCallRequired"
    ) {
      throw e;
    }

    console.error("Error formatting timestamp:", e);
    return "";
  }
};

export const generateCategoryImageSVG = (
  categoryString: string,
  screenWidth?: number,
  screenHeight?: number,
): string => {
  const categoryData = parseCategoryString(categoryString);

  // Hard threshold scaling based on aspect ratio
  const aspectRatio =
    screenWidth && screenHeight ? screenWidth / screenHeight : 1.0;
  const isMobile = aspectRatio < 0.75; // Hard threshold at 0.75 (more appropriate for phones)

  // Two distinct scaling modes
  const scaleFactor = isMobile ? 1.5 : 1.0; // Mobile gets 1.5x scaling, desktop stays 1.0x

  const width = 900;
  const headerHeight = 60 * scaleFactor;
  const rowHeight = 60 * scaleFactor;
  const cornerRadius = 20;
  const gap = 12 * scaleFactor;

  // Calculate exact content height with scaling
  const hasHighScore =
    parseInt(categoryData.played) > 0 && categoryData.highScoreUser;
  const highScoreSpacing = 70 * scaleFactor;
  const highScoreTextHeight = 30 * scaleFactor;

  // Calculate tight height - exactly what's needed for content
  const contentHeight =
    headerHeight +
    gap +
    rowHeight +
    (hasHighScore ? highScoreSpacing + highScoreTextHeight : 0);
  const tightHeight = contentHeight + 20 * scaleFactor; // Scaled padding
  const yOffset = 10 * scaleFactor; // Scaled top margin

  const totalFr = 3 + 2.5 + 1 + 1 + 0.8;
  const padding = 20 * scaleFactor;
  const availableWidth = width - padding * 2;
  const col1Width = (3 / totalFr) * availableWidth;
  const col2Width = (2.5 / totalFr) * availableWidth;
  const col3Width = (1 / totalFr) * availableWidth;
  const col4Width = (1 / totalFr) * availableWidth;
  const col5Width = (0.8 / totalFr) * availableWidth;

  // Scaled font sizes
  const headerFontSize = 18 * scaleFactor;
  const rowFontSize = 22 * scaleFactor;
  const highScoreFontSize = 24 * scaleFactor;

  const headerCells = ["Title", "Created By", "Played", "HS", "Ago"];
  const categoryCells = [
    categoryData.title,
    parseInt(categoryData.played) > 0 ? categoryData.creator : "",
    categoryData.played,
    parseInt(categoryData.played) > 0 ? categoryData.highScore : "0",
    formatRelativeTime(categoryData.timestamp),
  ];

  const colWidths = [col1Width, col2Width, col3Width, col4Width, col5Width];

  // Start SVG with exact content dimensions
  let svg = `<svg width="${width}" height="${tightHeight}" xmlns="http://www.w3.org/2000/svg" style="margin:0;padding:0;display:block;">`;

  // Header row positioned near the top with minimal margin
  svg += `<rect x="${padding / 2}" y="${yOffset}" width="${width - padding}" height="${headerHeight}" fill="#a4e2fc" rx="${cornerRadius}" ry="${cornerRadius}"/>`;

  // Category row immediately after the header with minimal gap
  svg += `<rect x="${padding / 2}" y="${yOffset + headerHeight + gap}" width="${width - padding}" height="${rowHeight}" fill="#ffcc80" rx="${cornerRadius}" ry="${cornerRadius}"/>`;

  // Header text with scaled font size
  let currentX = padding;
  headerCells.forEach((text, index) => {
    const textAnchor = index === 0 ? "start" : "middle";
    let x;
    if (index === 0) {
      x = currentX + 5 * scaleFactor;
    } else if (index == 4) {
      x = currentX + colWidths[index] / 2 + 10 * scaleFactor;
    } else {
      x = currentX + colWidths[index] / 2;
    }

    svg += `<text x="${x}" y="${yOffset + headerHeight / 2 + 6 * scaleFactor}" text-anchor="${textAnchor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${headerFontSize}" font-weight="bold" fill="#000000">${text}</text>`;
    currentX += colWidths[index];
  });

  // Category row text with scaled font size
  currentX = padding;
  categoryCells.forEach((text, index) => {
    const textAnchor = index === 0 ? "start" : index === 4 ? "end" : "middle";
    let x;
    if (index === 0) {
      x = currentX + 5 * scaleFactor;
    } else if (index === 4) {
      x = currentX + colWidths[index] / 2 + scaleFactor * 20;
    } else {
      x = currentX + colWidths[index] / 2;
    }

    const fill = index === 4 ? "#bb7900" : "#000000";
    const fontWeight = index < 4 ? "bold" : "normal";
    const fontStyle = index === 4 ? "italic" : "normal";

    svg += `<text x="${x}" y="${yOffset + headerHeight + gap + rowHeight / 2 + 6 * scaleFactor}" text-anchor="${textAnchor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${rowFontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fill}">${text}</text>`;
    currentX += colWidths[index];
  });

  // High score text if needed - positioned close to bottom with scaled font
  if (hasHighScore) {
    const highScoreY =
      yOffset + headerHeight + gap + rowHeight + highScoreSpacing;

    // Use two text elements to make username bold while keeping "High Score by" normal
    svg += `<text x="${width / 2 + 5 * scaleFactor}" y="${highScoreY}" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${highScoreFontSize}" font-weight="normal" fill="#FFFFFF">High Score by </text>`;
    svg += `<text x="${width / 2 + 15 * scaleFactor}" y="${highScoreY}" text-anchor="start" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${highScoreFontSize}" font-weight="bold" fill="#FFFFFF">${categoryData.highScoreUser}</text>`;
  }

  svg += "</svg>";

  // Encode SVG with minimal whitespace
  const base64 = btoa(
    encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
  return `data:image/svg+xml;base64,${base64}`;
};
