"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPositionColor, getPositionLabel } from "@/lib/utils/position";
import { Position } from "@prisma/client";
import {
  ArrowLeft,
  Trophy,
  Target,
  Medal,
  Award,
  Crown,
  Calendar,
  Clock,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import GuestSignupBanner from "@/components/custom/GuestSignupBanner";

interface Player {
  id: string;
  rank: number;
  name: string;
  goals: number;
  assists: number;
  appearances: number;
  position?: Position;
  avatarUrl?: string;
  abbreviation: string;
  totalTime?: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    players: Player[];
    year: number;
    type: string;
  };
  error?: any;
}

const PODIUM_COUNT = 3;
const ITEMS_PER_PAGE = 10;

export default function Leaderboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("goals");
  const [players, setPlayers] = useState<Player[]>([]);
  const [allTimePlayers, setAllTimePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTimeLoading, setAllTimeLoading] = useState(false);
  const [showAllTime, setShowAllTime] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Year selector state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    fetchLeaderboard(activeTab as 'goals' | 'assists');
  }, [activeTab, selectedYear]);

  useEffect(() => {
    if (showAllTime) {
      fetchAllTimeStats();
    }
  }, [showAllTime]);

  const fetchLeaderboard = async (type: 'goals' | 'assists') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=${type}&year=${selectedYear}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setPlayers(data.data.players);
      } else {
        toast.error('获取排行榜数据失败');
        console.error('Failed to fetch leaderboard:', data.error);
      }
    } catch (error) {
      toast.error('网络错误，请稍后重试');
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTimeStats = async () => {
    try {
      setAllTimeLoading(true);
      const response = await fetch('/api/players?public=true');
      const data = await response.json();

      if (data.success) {
        // Sort by the current active stat for all-time view
        const sortedPlayers = data.data
          .map((player: any, index: number) => ({
            ...player,
            rank: index + 1
          }))
          .sort((a: any, b: any) => {
            if (activeTab === 'goals') {
              return (b.goals || 0) - (a.goals || 0);
            } else {
              return (b.assists || 0) - (a.assists || 0);
            }
          })
          .map((player: any, index: number) => ({
            ...player,
            rank: index + 1
          }));

        setAllTimePlayers(sortedPlayers);
      }
    } catch (error) {
      console.error('Error fetching all-time stats:', error);
    } finally {
      setAllTimeLoading(false);
    }
  };

  const handlePlayerClick = (player: Player) => {
    if ((player as any).playerStatus === 'TRIAL') {
      toast.error('试训球员信息暂时不可见');
      return;
    }
    router.push(`/player/${player.id}`);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year));
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case 2:
        return "bg-gray-100 text-gray-800 border-gray-300";
      case 3:
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const currentPlayers = showAllTime ? allTimePlayers : players;
  const isLoading = showAllTime ? allTimeLoading : loading;

  const podiumPlayers = currentPlayers.slice(0, PODIUM_COUNT);
  const listPlayers = showAllPlayers
    ? currentPlayers.slice(PODIUM_COUNT)
    : currentPlayers.slice(PODIUM_COUNT, PODIUM_COUNT + 10);

  const totalPages = Math.ceil((currentPlayers.length - PODIUM_COUNT) / ITEMS_PER_PAGE);
  const paginatedPlayers = showAllPlayers
    ? currentPlayers.slice(PODIUM_COUNT + (currentPage - 1) * ITEMS_PER_PAGE, PODIUM_COUNT + currentPage * ITEMS_PER_PAGE)
    : listPlayers;

  const getCurrentStat = (player: Player) => {
    return activeTab === 'goals' ? player.goals : player.assists;
  };

  const getStatLabel = () => {
    return activeTab === 'goals' ? '进球' : '助攻';
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      <GuestSignupBanner
        className="border-muted bg-muted/30 text-foreground"
        buttonVariant="default"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Link>
        </Button>

        <div className="flex items-center gap-4">
          <Button
            variant={showAllTime ? "default" : "outline"}
            onClick={() => setShowAllTime(!showAllTime)}
          >
            <Clock className="mr-2 h-4 w-4" />
            {showAllTime ? "显示本赛季" : "历史统计"}
          </Button>

          {!showAllTime && (
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
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          {showAllTime ? "历史" : `${selectedYear}年`}排行榜
        </h1>
        {/* <p className="text-muted-foreground">
          {showAllTime ? "球员职业生涯统计数据" : `${selectedYear}赛季统计数据`}
        </p> */}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              射手榜
            </TabsTrigger>
            <TabsTrigger value="assists" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              助攻榜
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-8 mt-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-lg">加载中...</div>
            </div>
          ) : (
            <>
              {/* Podium */}
              {podiumPlayers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-center">
                      <Medal className="h-6 w-6" />
                      前三名
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {podiumPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="text-center space-y-4 p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handlePlayerClick(player)}
                        >
                          <div className="flex justify-center">
                            {getRankIcon(player.rank)}
                          </div>

                          <Avatar className="h-20 w-20 mx-auto">
                            <AvatarImage src={player.avatarUrl || ""} />
                            <AvatarFallback className="text-lg">
                              {player.abbreviation}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <h3 className="text-xl font-bold">{player.name}</h3>
                            {player.position && (
                              <Badge className={`mt-1 ${getPositionColor(player.position)}`}>
                                {player.position}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="text-3xl font-bold text-primary">
                              {getCurrentStat(player)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getStatLabel()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {player.appearances} 场出场
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* List View */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>完整排行榜</CardTitle>
                      <CardDescription>
                        {showAllTime ? "历史" : `${selectedYear}年`}{getStatLabel()}榜单
                        ({currentPlayers.length} 名球员)
                      </CardDescription>
                    </div>

                    {currentPlayers.length > PODIUM_COUNT + 10 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowAllPlayers(!showAllPlayers)}
                      >
                        {showAllPlayers ? (
                          <>收起</>
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
                          <TableHead className="w-16">排名</TableHead>
                          <TableHead>球员</TableHead>
                          <TableHead>位置</TableHead>
                          <TableHead className="text-center">{getStatLabel()}</TableHead>
                          <TableHead className="text-center">出场</TableHead>
                          <TableHead className="text-center">进球</TableHead>
                          <TableHead className="text-center">助攻</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPlayers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              暂无数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedPlayers.map((player) => (
                            <TableRow
                              key={player.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handlePlayerClick(player)}
                            >
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={getRankBadgeColor(player.rank)}
                                >
                                  {player.rank}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={player.avatarUrl || ""} />
                                    <AvatarFallback>
                                      {player.abbreviation}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{player.name}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {player.position ? (
                                  <Badge className={getPositionColor(player.position)}>
                                    {player.position}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="text-lg font-bold text-primary">
                                  {getCurrentStat(player)}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {player.appearances || 0}
                              </TableCell>
                              <TableCell className="text-center">
                                {player.goals || 0}
                              </TableCell>
                              <TableCell className="text-center">
                                {player.assists || 0}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {showAllPlayers && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        第 {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, currentPlayers.length - PODIUM_COUNT)} 条，
                        共 {currentPlayers.length - PODIUM_COUNT} 条记录
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          上一页
                        </Button>
                        <div className="text-sm">
                          {currentPage} / {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
