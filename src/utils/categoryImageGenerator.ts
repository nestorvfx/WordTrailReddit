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
  const parts = categoryString.split(':');
  
  return {
    code: parts[0] || '',
    creator: parts[1] || '',
    title: parts[2] || 'Unknown',
    words: parts[9] || '', 
    played: parts[3] || '0', 
    highScore: parts[4] || '0', 
    highScoreUser: parts[5] || '', 
    timestamp: parts[8] || '0', 
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
      
      if (e && typeof e === 'object' && 'message' in e && e.message === 'ServerCallRequired') {
        throw e; 
      }
      
      console.error("Error formatting timestamp:", e);
      return "";
    }
  };


export const generateCategoryImageSVG = (categoryString: string): string => {
  const categoryData = parseCategoryString(categoryString);
  
  const width = 900; 
  const fixedHeight = 250; // Increased from 200 to prevent cutoff of high score text
  const headerHeight = 60; 
  const rowHeight = 60; 
  const highScoreHeight = 30; 
  const cornerRadius = 20; 
  const gap = 12; 
  
  // Calculate content height and center it vertically
  const hasHighScore = parseInt(categoryData.played) > 0 && categoryData.highScoreUser;
  const contentHeight = headerHeight + gap + rowHeight + (hasHighScore ? highScoreHeight + 8 : 0);
  const yOffset = (fixedHeight - contentHeight) / 2; // Center the content vertically
  
  
  
  const totalFr = 3 + 2.5 + 1 + 1 + 0.8;
  const padding = 20; 
  const availableWidth = width - (padding * 2); 
  const col1Width = (3 / totalFr) * availableWidth;
  const col2Width = (2.5 / totalFr) * availableWidth;
  const col3Width = (1 / totalFr) * availableWidth;
  const col4Width = (1 / totalFr) * availableWidth;
  const col5Width = (0.8 / totalFr) * availableWidth;
  
  
  const headerCells = ['Title', 'Created By', 'Played', 'HS', 'Ago'];
  const categoryCells = [
    categoryData.title,
    parseInt(categoryData.played) > 0 ? categoryData.creator : '',
    categoryData.played,
    parseInt(categoryData.played) > 0 ? categoryData.highScore : '0',
    formatRelativeTime(categoryData.timestamp)
  ];
  
  const colWidths = [col1Width, col2Width, col3Width, col4Width, col5Width];
  
  
  let svg = `<svg width="${width}" height="${fixedHeight}" xmlns="http://www.w3.org/2000/svg">`;
  
  
  svg += `<rect x="${padding/2}" y="${yOffset + padding/2}" width="${width - padding}" height="${headerHeight}" fill="#a4e2fc" rx="${cornerRadius}" ry="${cornerRadius}"/>`;
  
  
  svg += `<rect x="${padding/2}" y="${yOffset + headerHeight + padding/2 + gap}" width="${width - padding}" height="${rowHeight}" fill="#ffcc80" rx="${cornerRadius}" ry="${cornerRadius}"/>`;
  
  
  let currentX = padding; 
  headerCells.forEach((text, index) => {
    const textAnchor = index === 0 ? 'start' : 'middle';
    let x;
    if (index === 0) {
      x = currentX + 5; 
    } else {
      x = currentX + colWidths[index] / 2;
    }
    
    svg += `<text x="${x}" y="${yOffset + padding/2 + headerHeight / 2 + 6}" text-anchor="${textAnchor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="bold" fill="#000000">${text}</text>`;
    currentX += colWidths[index];
  });
  
  
  currentX = padding; 
  categoryCells.forEach((text, index) => {
    const textAnchor = index === 0 ? 'start' : index === 4 ? 'end' : 'middle'; 
    let x;
    if (index === 0) {
      x = currentX + 5; 
    } else if (index === 4) {
      x = currentX + colWidths[index] /2+10; 
    } else {
      x = currentX + colWidths[index] / 2;
    }
    
    const fill = index === 4 ? '#bb7900' : '#000000'; 
    const fontWeight = index < 4 ? 'bold' : 'normal'; 
    
    svg += `<text x="${x}" y="${yOffset + headerHeight + padding/2 + gap + rowHeight / 2 + 6}" text-anchor="${textAnchor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="${fontWeight}" fill="${fill}">${text}</text>`;
    currentX += colWidths[index];
  });
  
  
  if (hasHighScore) {
    const highScoreY = yOffset + headerHeight + gap + rowHeight + 99; // 1.8 times further down (55 * 1.8 ≈ 99)
    
    // Use two text elements to make username bold while keeping "High Score by" normal
    svg += `<text x="${width / 2}" y="${highScoreY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="normal" fill="#FFFFFF">High Score by </text>`;
    
    // Calculate approximate width of "High Score by " to position username correctly
    const prefixWidth = 85; // Approximate width of "High Score by " at 24px
    svg += `<text x="${width / 2 + prefixWidth / 2}" y="${highScoreY}" text-anchor="start" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF">${categoryData.highScoreUser}</text>`;
  }
  
  svg += '</svg>';
  
  
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
};
