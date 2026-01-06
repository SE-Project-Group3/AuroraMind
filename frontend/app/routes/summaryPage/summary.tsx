import type { Route } from "./+types/summary";
import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { SummaryService } from "../../api/summary";
import type { SummaryItem } from "../../api/summary";

import './summary.scss';

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Summary - AuroraMind" },
        { name: "description", content: "AI Summary of your progress" },
    ];
}

export async function loader({}: Route.LoaderArgs) {
    return null;
}

export default function SummaryPage() {
    const [weeklyData, setWeeklyData] = useState<SummaryItem[]>([]);
    const [monthlyData, setMonthlyData] = useState<SummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [w, m] = await Promise.all([
                SummaryService.getWeekly(),
                SummaryService.getMonthly()
            ]);
            setWeeklyData(w);
            setMonthlyData(m);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            await SummaryService.generate("weekly", today);
            await fetchData();
        } catch (error: any) {
            alert("AI Generate failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const fmtDate = (str: string) => {
        const d = new Date(str);
        return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1)
            .toString().padStart(2,'0')}`;
    };

    if (loading) {
        return (
            <div className="loading-box">
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="timeline-page-container">

            {/* 时间轴 */}
            <div className="timeline-wrapper">

                <div className="timeline-column left-column">
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                        Weekly
                    </Typography>
                    {weeklyData.map((item, index) => (
                        <TimelineRow
                            key={item.id}
                            item={item}
                            position="left"
                            date={fmtDate(item.period_start)}
                            active={index === 0}
                        />
                    ))}
                </div>

                <div className="timeline-column right-column">
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                        Monthly
                    </Typography>
                    {monthlyData.map((item) => (
                        <TimelineRow
                            key={item.id}
                            item={item}
                            position="right"
                            date={fmtDate(item.period_start)}
                            active={false}
                        />
                    ))}
                </div>

            </div>

            {/* 底部 Generate 操作 */}
            <div className="summary-actions bottom">
                <Button
                    variant="contained"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    sx={{
                        borderRadius: '999px',
                        textTransform: 'none',
                        padding: '12px 32px',
                        minWidth: '280px'
                    }}
                >
                    {isGenerating ? "Processing..." : "Generate AI Weekly Summary"}
                </Button>
            </div>

        </div>
    );
}

function TimelineRow({ item, position, date, active }: any) {
    return (
        <div className={`timeline-row ${position}`}>

            <div className="date-section">
                {active && <span className="sub-label">Recent</span>}
                <span className="main-label">{date}</span>
            </div>

            <div className="line-section">
                <div className="line" />
                <div className="dot" />
            </div>

            <div className="card-section">
                {/* 恢复动画所需的 wrapper */}
                <div className="card-wrapper">
                    <Card
                        variant="outlined"
                        sx={{
                            borderRadius: '0.75rem',
                            borderColor: active ? '#90caf9' : 'divider',
                            borderWidth: active ? '2px' : '1px',
                            backgroundColor: '#fff',
                            height: '100%'
                        }}
                    >
                        <CardContent sx={{ padding: '1rem !important' }}>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}
                            >
                                {item.content}
                            </Typography>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}
