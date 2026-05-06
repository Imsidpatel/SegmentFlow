import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import pandas as pd
import tempfile
import matplotlib.pyplot as plt

def generate_pdf_report(company_name: str, rfm_data: pd.DataFrame, output_path: str):
    """Generates an executive PDF report based on the customer clustering data."""
    
    doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    styles = getSampleStyleSheet()
    Story = []
    
    # Title
    title_style = styles['Heading1']
    title_style.alignment = 1 # Center
    title = Paragraph(f"{company_name} - Customer Intelligence Report", title_style)
    Story.append(title)
    Story.append(Spacer(1, 24))
    
    # Executive Summary text
    summary = Paragraph(
        "This report provides an overview of your customer base split into predictive cohorts. "
        "We've applied RFM analysis and KMeans clustering to logically group your customers.",
        styles["Normal"]
    )
    Story.append(summary)
    Story.append(Spacer(1, 24))
    
    # Visualizing Segments (Generate temporary plot)
    # Using matplotlib as a simple stand-in for Plotly in standard PDF pipeline
    tmp_img = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    
    segment_counts = rfm_data['Segment'].value_counts()
    plt.figure(figsize=(6,4))
    segment_counts.plot(kind='bar', color=['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'])
    plt.title('Customer Segments Breakdown')
    plt.ylabel('Number of Customers')
    plt.tight_layout()
    plt.savefig(tmp_img.name)
    plt.close()
    
    img = RLImage(tmp_img.name, width=400, height=250)
    Story.append(img)
    Story.append(Spacer(1, 24))
    
    # Adding a Table of Insights
    table_data = [['Segment', 'Count', 'Avg. Spend', 'Suggested Next Action']]
    for row_name, count in segment_counts.items():
        avg_spend = f"₹{rfm_data[rfm_data['Segment'] == row_name]['Monetary'].mean():.2f}"
        
        # Hardcoded NBA for report visualization
        action = "Review Dashboard"
        if row_name == 'Champions': action = "VIP Loyalty"
        elif row_name == 'At Risk': action = "25% Discount"
        
        table_data.append([row_name, str(count), avg_spend, action])
        
    t = Table(table_data, colWidths=[100, 50, 80, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.beige),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ]))
    Story.append(t)
    
    # Build Document
    doc.build(Story)
    
    # Cleanup temp file
    os.remove(tmp_img.name)
    
    return output_path
