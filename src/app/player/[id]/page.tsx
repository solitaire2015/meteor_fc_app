"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPositionColor, getPositionLabel } from "@/lib/utils/position";
import { Position } from "@prisma/client";
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  Calendar, 
  Mail, 
  Phone, 
  Clock,
  ChevronUp,
  Eye
} from "lucide-react";

interface PlayerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number;
  position?: Position;
  avatarUrl?: string;
  joinDate?: string;
  abbreviation: string;
  createdAt: string;
  statistics: {
    goals: number;
    assists: number;
    appearances: number;
    year: number;
  };
  latestMatch?: {
    date: string;
    opponent: string;
    ourScore: number;
    opponentScore: number;
    result: string;
    totalFee: number;
  };
  recentEvents: Array<{
    type: string;
    matchDate: string;
    opponent: string;
    score: string;
    result: string;
  }>;
  attendanceHistory: Array<{
    matchId: string;
    matchDate: string;
    opponent: string;
    totalTime: number;
    totalFee: number;
    isLateArrival: boolean;
  }>;
}

interface AllTimeStats {
  goals: number;
  assists: number;
  appearances: number;
  totalTime: number;
}

const ITEMS_PER_PAGE = 10;

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;
  
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Year selector state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Pagination states
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [matchPage, setMatchPage] = useState(1);

  useEffect(() => {
    if (!playerId) return;
    fetchPlayerData();
  }, [playerId, selectedYear]);

  useEffect(() => {
    if (!playerId) return;
    fetchAllTimeStats();
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      if (playerData) {
        setDataLoading(true);
      } else {
        setLoading(true);
      }
      
      const response = await fetch(`/api/player/${playerId}?year=${selectedYear}`);
      const data = await response.json();

      if (data.success) {
        setPlayerData(data.data);
        setError(null);
      } else {
        setError(data.error?.message || 'Failed to load player data');
      }
    } catch (err) {
      setError('Failed to load player data');
      console.error('Error fetching player data:', err);
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  const fetchAllTimeStats = async () => {
    try {
      const response = await fetch(`/api/players`);
      const data = await response.json();
      
      if (data.success) {
        const currentPlayer = data.data.find((p: any) => p.id === playerId);
        if (currentPlayer) {
          setAllTimeStats({
            goals: currentPlayer.goals,
            assists: currentPlayer.assists,
            appearances: currentPlayer.appearances,
            totalTime: currentPlayer.totalTime || 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching all-time stats:', err);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year));
  };

  const handleViewMatch = (matchId: string) => {
    router.push(`/games/${matchId}`);
  };

  const getEventTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'GOAL': '进球',
      'ASSIST': '助攻',
      'PENALTY_GOAL': '点球',
      'YELLOW_CARD': '黄牌',
      'RED_CARD': '红牌',
      'OWN_GOAL': '乌龙球'
    };
    return typeMap[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'GOAL': 'bg-green-100 text-green-800',
      'ASSIST': 'bg-blue-100 text-blue-800',
      'PENALTY_GOAL': 'bg-purple-100 text-purple-800',
      'YELLOW_CARD': 'bg-yellow-100 text-yellow-800',
      'RED_CARD': 'bg-red-100 text-red-800',
      'OWN_GOAL': 'bg-gray-100 text-gray-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  const getMatchResult = (result: string) => {
    const resultMap: { [key: string]: string } = {
      'WIN': '胜利',
      'LOSS': '失败',
      'DRAW': '平局'
    };
    return resultMap[result] || '已结束';
  };

  const paginatedMatches = showAllMatches 
    ? playerData?.attendanceHistory.slice((matchPage - 1) * ITEMS_PER_PAGE, matchPage * ITEMS_PER_PAGE) || []
    : playerData?.attendanceHistory.slice(0, 5) || [];

  const totalPages = Math.ceil((playerData?.attendanceHistory.length || 0) / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error || '球员信息未找到'}</p>
          <Button asChild variant="outline">
            <Link href="/leaderboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回排行榜
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/leaderboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回排行榜
          </Link>
        </Button>
        
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 3 }, (_, i) => currentYear - i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Player Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={playerData.avatarUrl || ""} />
              <AvatarFallback className="text-2xl">
                {playerData.abbreviation}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold">{playerData.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  {playerData.jerseyNumber && (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      #{playerData.jerseyNumber}
                    </Badge>
                  )}
                  {playerData.position && (
                    <Badge className={getPositionColor(playerData.position)}>
                      {playerData.position} - {getPositionLabel(playerData.position)}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {playerData.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {playerData.email}
                  </div>
                )}
                {playerData.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {playerData.phone}
                  </div>
                )}
                {playerData.joinDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    加入时间: {new Date(playerData.joinDate).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Statistics Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Season Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {selectedYear}年 统计数据
              </CardTitle>
              {dataLoading && (
                <CardDescription>更新中...</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{playerData.statistics.goals}</div>
                  <div className="text-sm text-muted-foreground">进球</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{playerData.statistics.assists}</div>
                  <div className="text-sm text-muted-foreground">助攻</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{playerData.statistics.appearances}</div>
                  <div className="text-sm text-muted-foreground">出场次数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All-Time Statistics */}
          {allTimeStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  历史总统计
                </CardTitle>
                <CardDescription>
                  球员职业生涯总数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{allTimeStats.goals}</div>
                    <div className="text-sm text-muted-foreground">总进球</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{allTimeStats.assists}</div>
                    <div className="text-sm text-muted-foreground">总助攻</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{allTimeStats.appearances}</div>
                    <div className="text-sm text-muted-foreground">总出场</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Events */}
          {playerData.recentEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>近期表现</CardTitle>
                <CardDescription>
                  {selectedYear}年的比赛事件记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {playerData.recentEvents.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge className={getEventTypeColor(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                        <div>
                          <div className="font-medium">vs {event.opponent}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.matchDate).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{event.score}</div>
                        <div className="text-sm text-muted-foreground">
                          {getMatchResult(event.result)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Latest Match Sidebar */}
        <div className="space-y-6">
          {playerData.latestMatch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  最近比赛
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    {new Date(playerData.latestMatch.date).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="text-lg font-bold mt-1">
                    vs {playerData.latestMatch.opponent}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {playerData.latestMatch.ourScore}-{playerData.latestMatch.opponentScore}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getMatchResult(playerData.latestMatch.result)}
                  </div>
                </div>
                
                <div className="text-center pt-2 border-t">
                  <div className="text-sm text-muted-foreground">个人费用</div>
                  <div className="text-lg font-semibold">
                    ¥{Math.ceil(Number(playerData.latestMatch.totalFee || 0))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Match History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>出场记录</CardTitle>
              <CardDescription>
                {selectedYear}年的比赛参与记录 ({playerData.attendanceHistory.length} 场比赛)
              </CardDescription>
            </div>
            {playerData.attendanceHistory.length > 5 && (
              <Button 
                variant="outline" 
                onClick={() => setShowAllMatches(!showAllMatches)}
              >
                {showAllMatches ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    收起
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    查看全部
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>对手</TableHead>
                  <TableHead>出场时间</TableHead>
                  <TableHead>费用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {selectedYear}年暂无出场记录
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMatches.map((match) => (
                    <TableRow key={match.matchId}>
                      <TableCell>
                        {new Date(match.matchDate).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="font-medium">{match.opponent}</TableCell>
                      <TableCell>{Number(match.totalTime || 0).toFixed(1)} 个时间单位</TableCell>
                      <TableCell>¥{Math.ceil(Number(match.totalFee || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={match.isLateArrival ? "destructive" : "default"}>
                          {match.isLateArrival ? "迟到" : "准时到场"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewMatch(match.matchId)}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination for all matches */}
          {showAllMatches && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                第 {((matchPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(matchPage * ITEMS_PER_PAGE, playerData.attendanceHistory.length)} 条，
                共 {playerData.attendanceHistory.length} 条记录
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={matchPage === 1}
                  onClick={() => setMatchPage(matchPage - 1)}
                >
                  上一页
                </Button>
                <div className="text-sm">
                  {matchPage} / {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={matchPage === totalPages}
                  onClick={() => setMatchPage(matchPage + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
