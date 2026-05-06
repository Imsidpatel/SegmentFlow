import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Note: Assuming Lucide React is installed for icons
import { Users, Mail, AlertTriangle, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CustomerIntelligenceTable = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/customers/', {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        
        if (res.status === 401) {
          sessionStorage.removeItem('token');
          navigate('/auth');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const getSegmentColor = (segment) => {
    switch(segment) {
      case 'Champions': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'At Risk': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Hibernating': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRecommendation = (segment) => {
    switch(segment) {
      case 'Champions': return 'Offer exclusive early access to new products';
      case 'At Risk': return 'Send a 20% discount on trendy products';
      case 'Hibernating': return 'Send a "We miss you" re-engagement offer';
      default: return 'Send standard monthly newsletter';
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Helper functions
    const addSectionTitle = (title) => {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(title, 14, yPos);
      yPos += 8;
    };

    const addParagraph = (text) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(text, pageWidth - 28);
      doc.text(splitText, 14, yPos);
      yPos += splitText.length * 5 + 6;
    };

    // Calculate KPIs
    const totalCustomers = customers.length;
    let highRiskCount = 0;
    let estimatedRevenueUplift = 0;
    
    customers.forEach(c => {
      if (c.risk === 'High') highRiskCount++;
      if (c.segment === 'At Risk') estimatedRevenueUplift += (c.clv * 0.15);
      if (c.segment === 'Champions') estimatedRevenueUplift += (c.clv * 0.05);
      if (c.segment === 'Hibernating') estimatedRevenueUplift += 50;
    });

    estimatedRevenueUplift = Math.round(estimatedRevenueUplift);

    // 1. Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text('Customer Intelligence & Analytics Report', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPos);
    yPos += 14;

    // 2. Executive Summary
    addSectionTitle('Executive Summary');
    addParagraph('This report provides a comprehensive intelligence summary on your customer base. Our goal is to flag the most critical cohorts that require immediate retention efforts, while isolating highly profitable champions for VIP treatment. The strategic focus remains minimizing overall churn while maximizing Customer Lifetime Value (CLV).');

    // 3. Methodology
    addSectionTitle('Methodology');
    addParagraph('Customer segments are derived directly using an AI-driven behavioral modeling technique (K-Means Clustering). This model analyzes historical data based on Recency, Frequency, and Monetary (RFM) characteristics. The predictive insights assign each customer into actionable quadrants based on statistical probability to churn vs. their projected lifetime spend.');

    // 4. KPIs
    addSectionTitle('Key Performance Indicators (KPIs)');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Total Customers Analyzed: ${totalCustomers}`, 18, yPos); yPos += 6;
    doc.text(`• "High Risk" Accounts Identified: ${highRiskCount}`, 18, yPos); yPos += 6;
    doc.text(`• Projected Revenue Uplift: INR ${estimatedRevenueUplift.toLocaleString()}`, 18, yPos); yPos += 12;

    // 5. Native Visual Charts (Generated via Canvas based on Dataset)
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 300);

    const segmentCounts = {};
    const segmentClvTotal = {};
    customers.forEach(c => {
       let seg = c.segment || 'Regulars';
       segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
       segmentClvTotal[seg] = (segmentClvTotal[seg] || 0) + c.clv;
    });

    const colors = { 'Champions': '#10b981', 'At Risk': '#f43f5e', 'New Customers': '#3b82f6', 'Hibernating': '#64748b', 'Regulars': '#6366f1' };

    // Draw Pie
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText('Segment Demographics', 50, 40);
    let startAngle = 0;
    if (totalCustomers > 0) {
      for (let seg in segmentCounts) {
        let val = segmentCounts[seg];
        if (val === 0) continue;
        let sliceAngle = (val / totalCustomers) * 2 * Math.PI;
        ctx.fillStyle = colors[seg] || '#ccc';
        ctx.beginPath();
        ctx.moveTo(150, 165);
        ctx.arc(150, 165, 100, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        startAngle += sliceAngle;
      }
      let legendY = 90;
      for (let seg in segmentCounts) {
        if (segmentCounts[seg] === 0) continue;
        ctx.fillStyle = colors[seg] || '#ccc';
        ctx.fillRect(280, legendY - 14, 18, 18);
        ctx.fillStyle = '#475569';
        ctx.font = '15px Helvetica';
        let percentage = Math.round((segmentCounts[seg]/totalCustomers)*100);
        ctx.fillText(`${seg} (${percentage}%)`, 310, legendY);
        legendY += 30;
      }
    }

    // Draw Bar Chart
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText('Average Lifetime Value (CLV) by Segment', 450, 40);
    let maxClv = 0;
    const avgClv = {};
    for (let seg in segmentCounts) {
      if (segmentCounts[seg] > 0) {
        avgClv[seg] = segmentClvTotal[seg] / segmentCounts[seg];
        if (avgClv[seg] > maxClv) maxClv = avgClv[seg];
      }
    }
    if (maxClv > 0) {
      let activeSegments = Object.keys(avgClv);
      let barWidth = 45;
      let spacing = 20;
      let startX = 450;
      let chartBottom = 265;
      let maxBarHeight = 170;
      
      activeSegments.forEach((seg, i) => {
        let val = avgClv[seg];
        let height = (val / maxClv) * maxBarHeight;
        ctx.fillStyle = colors[seg] || '#ccc';
        ctx.fillRect(startX + i * (barWidth + spacing), chartBottom - height, barWidth, height);
        ctx.fillStyle = '#475569';
        ctx.font = '12px Helvetica';
        ctx.fillText(seg.split(' ')[0], startX + i * (barWidth + spacing), chartBottom + 20);
        ctx.font = '11px Helvetica';
        ctx.fillText(`₹${Math.round(val/1000)}k`, startX + i * (barWidth + spacing), chartBottom - height - 8);
      });
    }

    const chartImgData = canvas.toDataURL('image/png');
    addSectionTitle('Analytical Visualizations');
    doc.addImage(chartImgData, 'PNG', 14, yPos, 180, 67.5);
    yPos += 75;

    // 6. Data Grid
    addSectionTitle('Customer Insights Table');
    
    const tableColumn = ["Customer Name", "Segment Profile", "Est. Lifetime Value (CLV)", "Churn Risk", "Targeted Action"];
    const tableRows = customers.map(c => [
      c.name,
      c.segment,
      `INR ${c.clv.toLocaleString()}`,
      c.risk,
      getRecommendation(c.segment)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 14;

    // check pagination
    if (yPos > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      yPos = 20;
    }

    // 6. Insights and Recommendations
    addSectionTitle('Insights and Recommendations');
    addParagraph('Immediate priority must be placed on the ' + highRiskCount + ' target accounts flagged as "High Risk." We recommend executing automated targeted retention campaigns (such as personalized discount codes or dedicated support outreach) to prevent total volume churn. Nurture paths should also be built around Champions to amplify natural momentum and scale existing engagement.');

    doc.save('SegmentFlow_Intelligence_Report.pdf');
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-100">
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Customer Intelligence Hub
          </h2>
          <p className="text-slate-500 mt-1">Review segments, predicted CLV, and trigger Next Best Actions.</p>
        </div>
        <button onClick={generatePDF} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm flex items-center gap-2">
          Export Report
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200">
              <th className="p-4">Customer</th>
              <th className="p-4">Segment</th>
              <th className="p-4">Est. CLV</th>
              <th className="p-4">Churn Risk</th>
              <th className="p-4 bg-indigo-50 text-indigo-900 border-l border-indigo-100">AI Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{c.email} • {c.lastActive}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 flex items-center w-max gap-1.5 rounded-full text-xs font-semibold border ${getSegmentColor(c.segment)}`}>
                    {c.segment === 'Champions' && <ShieldCheck className="w-3.5 h-3.5" />}
                    {c.segment === 'At Risk' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {c.segment}
                  </span>
                </td>
                <td className="p-4 font-mono font-medium text-slate-700">
                  ₹{c.clv.toLocaleString()}
                </td>
                <td className="p-4">
                  <span className={`font-semibold ${c.risk === 'High' ? 'text-rose-600' : c.risk === 'Low' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {c.risk}
                  </span>
                </td>
                <td className="p-4 border-l border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">
                      {getRecommendation(c.segment)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {isLoading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-indigo-500 font-medium">
                  Loading customer intelligence data...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500">
                  No customers found. Please upload a dataset to generate insights.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerIntelligenceTable;
