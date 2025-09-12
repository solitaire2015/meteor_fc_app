"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Users, Trophy, Eye } from "lucide-react";

interface MatchData {
  id: string;
  matchDate: string;
  opponentTeam: string;
  ourScore?: number | null;
  opponentScore?: number | null;
  fieldFeeTotal: number;
  waterFeeTotal: number;
  totalParticipants: number;
  participationsCount: number;
}

export default function GamesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.data);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getMatchResult = (match: MatchData) => {
    if (match.ourScore !== null && match.opponentScore !== null) {
      const result = match.ourScore > match.opponentScore ? '胜利' : 
                    match.ourScore < match.opponentScore ? '失败' : '平局';
      return {
        score: `${match.ourScore} : ${match.opponentScore}`,
        result,
        color: match.ourScore > match.opponentScore ? 'text-green-600' :
               match.ourScore < match.opponentScore ? 'text-red-600' : 'text-yellow-600'
      };
    }
    return { score: '即将开始', result: '未开始', color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">比赛记录</h1>
          <p className="text-muted-foreground mt-2">
            查看所有比赛详情和统计数据 ({matches.length} 场比赛)
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            暂无比赛记录
          </div>
        ) : (
          matches.map((match) => {
            const matchResult = getMatchResult(match);
            
            return (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">VS {match.opponentTeam}</span>
                    <Badge variant={matchResult.result === '未开始' ? 'secondary' : 'default'}>
                      {matchResult.result}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(match.matchDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${matchResult.color}`}>
                      {matchResult.score}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {match.participationsCount || 0} 名球员
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      ¥{Number(match.fieldFeeTotal + match.waterFeeTotal || 0).toFixed(0)}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => router.push(`/games/${match.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    查看详情
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}