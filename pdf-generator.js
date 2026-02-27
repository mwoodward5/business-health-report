/* ============================================
   PDF GENERATOR — Rocket Search 6-Page Report
   Supports Live Data + Demo Mode indicators
   ============================================ */

window.PDFGenerator = {
  generate: function (business, scores, findings, competitors, dataMode) {
   try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = 210, H = 297;
    const margin = 20;
    const contentW = W - margin * 2;

    const navy = [10, 22, 40];
    const navyMid = [15, 31, 61];
    const gold = [212, 168, 73];
    const white = [255, 255, 255];
    const gray = [156, 163, 175];
    const emerald = [16, 185, 129];
    const red = [239, 68, 68];
    const blue = [59, 130, 246];
    const yellow = [245, 158, 11];
    const orange = [249, 115, 22];

    const overall = scores.overall;
    const grade = ScoringEngine.getLetterGrade(overall);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const mode = dataMode || 'demo';

    function getColor(score) {
      if (score >= 90) return emerald;
      if (score >= 80) return blue;
      if (score >= 70) return yellow;
      if (score >= 60) return orange;
      return red;
    }

    function addPageBg() {
      doc.setFillColor(...navy);
      doc.rect(0, 0, W, H, 'F');
    }

    function addFooter(pageNum) {
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text(`Rocket Search | Confidential`, margin, H - 10);
      doc.text(`Page ${pageNum} of 6`, W - margin, H - 10, { align: 'right' });

      // Data mode indicator
      const modeText = mode === 'live' ? 'Live Data' : 'Demo Mode';
      const modeColor = mode === 'live' ? emerald : yellow;
      doc.setTextColor(...modeColor);
      doc.text(modeText, W / 2, H - 10, { align: 'center' });
    }

    function drawBar(x, y, w, h, score) {
      doc.setFillColor(30, 45, 70);
      doc.roundedRect(x, y, w, h, 2, 2, 'F');
      const fillW = (score / 100) * w;
      const c = getColor(score);
      doc.setFillColor(...c);
      doc.roundedRect(x, y, Math.max(fillW, 4), h, 2, 2, 'F');
    }

    // ============ PAGE 1: COVER ============
    addPageBg();

    // Gold accent line at top
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    // Brand
    doc.setFontSize(12);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('ROCKET SEARCH', W / 2, 40, { align: 'center' });

    // Title
    doc.setFontSize(32);
    doc.setTextColor(...white);
    doc.text('Digital Health', W / 2, 80, { align: 'center' });
    doc.text('Report', W / 2, 95, { align: 'center' });

    // Divider
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 30, 105, W / 2 + 30, 105);

    // Business Name
    doc.setFontSize(20);
    doc.setTextColor(...white);
    doc.text(business.businessName, W / 2, 125, { align: 'center' });

    // Details
    doc.setFontSize(11);
    doc.setTextColor(...gray);
    doc.text(`${business.industry} | ${business.city}, ${business.state}`, W / 2, 135, { align: 'center' });

    // Score circle
    const cx = W / 2, cy = 180;
    doc.setFillColor(20, 35, 60);
    doc.circle(cx, cy, 28, 'F');
    doc.setDrawColor(...getColor(overall));
    doc.setLineWidth(2.5);
    doc.circle(cx, cy, 28, 'S');
    doc.setFontSize(28);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(String(overall), cx, cy - 2, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(...getColor(overall));
    doc.text(grade, cx, cy + 10, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.text('Overall Digital Health Score', cx, cy + 22, { align: 'center' });

    // Data mode badge on cover
    const modeLabel = mode === 'live' ? 'LIVE DATA REPORT' : 'DEMO MODE REPORT';
    const modeClr = mode === 'live' ? emerald : yellow;
    doc.setFontSize(9);
    doc.setTextColor(...modeClr);
    doc.setFont('helvetica', 'bold');
    doc.text(modeLabel, W / 2, cy + 32, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Generated: ${today}`, W / 2, H - 30, { align: 'center' });

    // Prepared for subtitle in gold
    doc.setFontSize(14);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared for ' + (business.ownerName || ''), W / 2, 113, { align: 'center' });

    // Confidential
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text('Confidential — Prepared exclusively for ' + (business.ownerName || ''), W / 2, H - 20, { align: 'center' });

    addFooter(1);

    // ============ PAGE 2: EXECUTIVE SUMMARY ============
    doc.addPage();
    addPageBg();
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, 30);

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, margin + 50, 35);

    let y = 50;
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');

    const summaryText = `This report provides a comprehensive analysis of ${business.businessName}'s digital presence across five key areas: Website Performance, Search Visibility (SEO), Google Business Profile, Online Reputation, and Social Media Presence.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentW);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 8;

    // Key Metrics Box
    doc.setFillColor(...navyMid);
    doc.roundedRect(margin, y, contentW, 65, 4, 4, 'F');

    const metricsData = [
      { label: 'Overall Score', value: `${overall}/100` },
      { label: 'Grade', value: grade },
      { label: 'Critical Issues', value: String(findings.filter(f => f.priority === 'critical').length) },
      { label: 'Market Position', value: `#${competitors.find(c => c.isTarget)?.rank || '?'} of ${competitors.length}` },
    ];

    const mColW = contentW / 4;
    metricsData.forEach((m, i) => {
      const mx = margin + i * mColW + mColW / 2;
      doc.setFontSize(18);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text(m.value, mx, y + 18, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.setFont('helvetica', 'normal');
      doc.text(m.label, mx, y + 26, { align: 'center' });
    });

    // "What This Means" explanation
    const targetRank = competitors.find(c => c.isTarget)?.rank || '?';
    const critCount = findings.filter(f => f.priority === 'critical').length;
    let lostPct = overall < 40 ? '60-80' : overall < 55 ? '40-60' : overall < 70 ? '25-40' : '10-25';
    const whatThisMeansText = `Your score of ${overall}/100 means your business is losing an estimated ${lostPct}% of potential online customers to competitors with stronger digital presences. With ${critCount} critical issue${critCount !== 1 ? 's' : ''} and a market position of #${targetRank} out of ${competitors.length}, immediate action is needed to stop the revenue leak.`;
    doc.setFontSize(8);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'normal');
    const whatLines = doc.splitTextToSize(whatThisMeansText, contentW - 16);
    doc.text(whatLines, margin + 8, y + 36);

    y += 75;

    // Key findings summary
    doc.setFontSize(14);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Findings', margin, y);
    y += 10;

    findings.slice(0, 6).forEach((f) => {
      const prColor = f.priority === 'critical' ? red : f.priority === 'high' ? orange : yellow;
      doc.setFillColor(...prColor);
      doc.roundedRect(margin, y, 3, 10, 1, 1, 'F');

      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.text(f.title, margin + 7, y + 4);

      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.setFont('helvetica', 'normal');
      const impLines = doc.splitTextToSize(f.impact, contentW - 10);
      doc.text(impLines[0] || '', margin + 7, y + 9);
      y += 16;
    });

    addFooter(2);

    // ============ PAGE 3: CATEGORY BREAKDOWN (Part 1) ============
    doc.addPage();
    addPageBg();
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown', margin, 30);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, margin + 50, 35);

    y = 48;
    const cats = Object.entries(scores.categories);

    for (let i = 0; i < 3 && i < cats.length; i++) {
      const [key, cat] = cats[i];
      const cColor = getColor(cat.score);

      doc.setFillColor(...navyMid);
      doc.roundedRect(margin, y, contentW, 70, 4, 4, 'F');

      doc.setFontSize(14);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      const catLabel = cat.name + (cat.metrics && cat.metrics._real ? ' *' : '');
      doc.text(catLabel, margin + 8, y + 12);

      doc.setFontSize(20);
      doc.setTextColor(...cColor);
      doc.text(`${cat.score}`, W - margin - 8, y + 14, { align: 'right' });

      doc.setFontSize(10);
      doc.text(ScoringEngine.getLetterGrade(cat.score), W - margin - 22, y + 14, { align: 'right' });

      drawBar(margin + 8, y + 20, contentW - 16, 5, cat.score);

      const catFindings = findings.filter(f => {
        if (key === 'website') return f.category === 'Website';
        if (key === 'seo') return f.category === 'SEO';
        if (key === 'gbp') return f.category === 'GBP';
        return false;
      });

      let fy = y + 32;
      catFindings.slice(0, 3).forEach(f => {
        const prColor2 = f.priority === 'critical' ? red : f.priority === 'high' ? orange : yellow;
        doc.setFillColor(...prColor2);
        doc.circle(margin + 12, fy + 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'normal');
        const tLines = doc.splitTextToSize(f.title + ' — ' + f.stat, contentW - 20);
        doc.text(tLines[0] || '', margin + 17, fy + 3);
        fy += 9;
      });

      y += 78;
    }

    addFooter(3);

    // ============ PAGE 4: CATEGORY BREAKDOWN (Part 2) ============
    doc.addPage();
    addPageBg();
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown (cont.)', margin, 30);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, margin + 60, 35);

    y = 48;
    for (let i = 3; i < cats.length; i++) {
      const [key, cat] = cats[i];
      const cColor = getColor(cat.score);

      doc.setFillColor(...navyMid);
      doc.roundedRect(margin, y, contentW, 70, 4, 4, 'F');

      doc.setFontSize(14);
      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      const catLabel = cat.name + (cat.metrics && cat.metrics._real ? ' *' : '');
      doc.text(catLabel, margin + 8, y + 12);

      doc.setFontSize(20);
      doc.setTextColor(...cColor);
      doc.text(`${cat.score}`, W - margin - 8, y + 14, { align: 'right' });

      doc.setFontSize(10);
      doc.text(ScoringEngine.getLetterGrade(cat.score), W - margin - 22, y + 14, { align: 'right' });

      drawBar(margin + 8, y + 20, contentW - 16, 5, cat.score);

      const catFindings = findings.filter(f => {
        if (key === 'reputation') return f.category === 'Reputation';
        if (key === 'social') return f.category === 'Social';
        return false;
      });

      let fy = y + 32;
      catFindings.slice(0, 3).forEach(f => {
        const prColor2 = f.priority === 'critical' ? red : f.priority === 'high' ? orange : yellow;
        doc.setFillColor(...prColor2);
        doc.circle(margin + 12, fy + 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'normal');
        const tLines = doc.splitTextToSize(f.title + ' — ' + f.stat, contentW - 20);
        doc.text(tLines[0] || '', margin + 17, fy + 3);
        fy += 9;
      });

      y += 78;
    }

    // Data source note
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    if (mode === 'live') {
      doc.text('* Categories marked with an asterisk use live data from Google APIs.', margin, y);
      doc.text('Unmarked categories use estimated data based on industry benchmarks.', margin, y + 5);
    } else {
      doc.text('This report was generated in Demo Mode using estimated data.', margin, y);
      doc.text('Connect a Google API key for live business data and real competitor analysis.', margin, y + 5);
    }

    addFooter(4);

    // ============ PAGE 5: COMPETITOR COMPARISON ============
    doc.addPage();
    addPageBg();
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Competitive Analysis', margin, 30);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, margin + 50, 35);

    y = 48;
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    const compIntro = `Here's how ${business.businessName} compares to the top ${business.industry.toLowerCase()} businesses in ${business.city}, ${business.state}.`;
    doc.text(compIntro, margin, y);
    y += 12;

    // Competitor table using autoTable
    doc.autoTable({
      startY: y,
      head: [['Rank', 'Business', 'Score', 'Grade', 'Reviews']],
      body: competitors.map(c => [
        `#${c.rank}`,
        c.name + (c.isTarget ? ' (You)' : ''),
        String(c.score),
        c.grade,
        String(c.reviews),
      ]),
      theme: 'plain',
      styles: {
        fillColor: navy,
        textColor: gray,
        fontSize: 9,
        cellPadding: 4,
        lineColor: [30, 45, 70],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: navyMid,
        textColor: gold,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: navy,
      },
      didParseCell: function (data) {
        if (data.section === 'body') {
          const rowData = competitors[data.row.index];
          if (rowData && rowData.isTarget) {
            data.cell.styles.textColor = gold;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 15;

    // Visual bar comparison
    doc.setFontSize(12);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Comparison', margin, y);
    y += 8;

    competitors.forEach(c => {
      const cColor = c.isTarget ? gold : getColor(c.score);
      doc.setFontSize(8);
      if (c.isTarget) { doc.setTextColor(...gold); } else { doc.setTextColor(...gray); }
      doc.setFont('helvetica', c.isTarget ? 'bold' : 'normal');
      doc.text(c.name.substring(0, 30), margin, y + 3);

      drawBar(margin + 70, y, contentW - 90, 5, c.score);

      doc.setTextColor(...cColor);
      doc.setFont('helvetica', 'bold');
      doc.text(String(c.score), W - margin, y + 3, { align: 'right' });

      y += 10;
    });

    addFooter(5);

    // ============ PAGE 6: RECOMMENDATIONS + CTA ============
    doc.addPage();
    addPageBg();
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', margin, 30);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, margin + 50, 35);

    y = 48;
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text('Based on our analysis, here are the top priorities for improving your digital presence:', margin, y);
    y += 12;

    const priorities = [
      { title: 'Immediate Action (This Week)', items: findings.filter(f => f.priority === 'critical').slice(0, 3) },
      { title: 'Short-Term (This Month)', items: findings.filter(f => f.priority === 'high').slice(0, 3) },
      { title: 'Ongoing Improvements', items: findings.filter(f => f.priority === 'medium').slice(0, 2) },
    ];

    priorities.forEach(group => {
      if (group.items.length === 0) return;
      doc.setFontSize(12);
      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.text(group.title, margin, y);
      y += 7;

      group.items.forEach((item, idx) => {
        doc.setFillColor(...navyMid);
        doc.roundedRect(margin, y, contentW, 18, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(...white);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${item.title}`, margin + 5, y + 7);
        doc.setFontSize(8);
        doc.setTextColor(...gray);
        doc.setFont('helvetica', 'normal');
        const recLine = doc.splitTextToSize(item.stat, contentW - 12);
        doc.text(recLine[0] || '', margin + 5, y + 13);
        y += 22;
      });
      y += 5;
    });

    // CTA Box
    y = Math.max(y + 10, 200);
    // Ensure CTA box fits on the page
    if (y + 85 > H - 15) y = H - 100;
    doc.setFillColor(20, 35, 60);
    doc.roundedRect(margin, y, contentW, 80, 6, 6, 'F');
    doc.setDrawColor(...gold);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentW, 80, 6, 6, 'S');

    doc.setFontSize(16);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Every Day Without Action Costs You Customers', W / 2, y + 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'normal');
    const ctaLine1 = `Right now, competitors are capturing the customers who can't find you online.`;
    const ctaLine2 = `Your ${findings.filter(f => f.priority === 'critical').length} critical issues are actively driving revenue to other businesses.`;
    const ctaLine3 = `The longer you wait, the harder it becomes to close the gap.`;
    doc.text(ctaLine1, W / 2, y + 26, { align: 'center' });
    doc.text(ctaLine2, W / 2, y + 34, { align: 'center' });
    doc.text(ctaLine3, W / 2, y + 42, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text('Schedule your free strategy call today.', W / 2, y + 54, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Rocket Search | Mark Woodward | (714) 609-6275', W / 2, y + 64, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.text('woodwardsoftware@gmail.com | Mission Viejo, CA', W / 2, y + 71, { align: 'center' });

    addFooter(6);

    // ============ SAVE ============
    const filename = `${business.businessName.replace(/[^a-zA-Z0-9]/g, '_')}_Digital_Health_Report.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Don't revoke immediately - give the browser time
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    // Fallback: if the download doesn't trigger within 2 seconds, open in new tab
    setTimeout(() => {
      window.open(url, '_blank');
    }, 2000);

    if (window.showToast) showToast('PDF report downloaded!', 'success');

   } catch(err) {
    console.error('PDF generation error:', err);
    if (window.showToast) showToast('PDF generation failed: ' + err.message, 'error');
   }
  },
};
