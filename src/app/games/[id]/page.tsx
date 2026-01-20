"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AttendanceData, FeeOverride } from "@/types/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GuestSignupBanner from "@/components/custom/GuestSignupBanner";
import { 
  ArrowLeft, 
  Calendar,
  Users,
  Trophy,
  Target,
  Clock,
  DollarSign,
  Video,
  ChevronDown,
  ChevronRight,
  MapPin,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

interface MatchData {
  id: string;
  matchDate: string;
  opponentTeam: string;
  ourScore?: number | null;
  opponentScore?: number | null;
  fieldFeeTotal: number;
  waterFeeTotal: number;
  notes?: string;
  participations: MatchParticipation[];
  events: MatchEvent[];
}

interface MatchParticipation {
  id: string;
  userId: string;
  attendanceData: AttendanceData;
  isLateArrival: boolean;
  totalTime: number;
  fieldFeeCalculated: number;
  lateFee: number;
  videoFee: number;
  totalFeeCalculated: number;
  user: {
    id: string;
    name: string;
    jerseyNumber?: number;
    position?: string;
  };
}

interface MatchEvent {
  id: string;
  eventType: string;
  minute?: number;
  description?: string;
  player: {
    id: string;
    name: string;
    jerseyNumber?: number;
  };
}

interface Player {
  id: string;
  name: string;
  section1: (number | string)[];
  section2: (number | string)[];
  section3: (number | string)[];
  total: number;
  fieldFee: number;
  isLate: boolean;
  videoCost: number;
  lateFee: number;
  totalCost: number;
  notes: string;
  isGoalkeeper: boolean;
  hasOverride: boolean;
}

interface GameStat {
  name: string;
  goals: number;
  assists: number;
}

interface VideoRecord {
  fileName: string;
  description: string;
  url: string;
  extractCode: string;
}

const roundFee = (value: number) => Math.ceil(value);

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [gameData, setGameData] = useState<Player[]>([]);
  const [gameStats, setGameStats] = useState<GameStat[]>([]);
  const [videoRecord, setVideoRecord] = useState<VideoRecord | null>(null);

  useEffect(() => {
    if (matchId) {
      fetchMatchData();
    }
  }, [matchId]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/games/${matchId}`);
      const data = await response.json();
      
      if (data.success) {
        const matchInfo = data.data;
        setMatch(matchInfo);
        
        // Fetch fee overrides
        const overrideResponse = await fetch(`/api/admin/matches/${matchId}/overrides`);
        let feeOverrides: FeeOverride[] = [];
        const overrideContentType = overrideResponse.headers.get('content-type') || '';
        if (overrideResponse.ok && overrideContentType.includes('application/json')) {
          const overrideData = await overrideResponse.json();
          feeOverrides = overrideData.success ? overrideData.data : [];
        }
        
        // Transform participation data
        if (matchInfo.participations?.length > 0) {
          const players: Player[] = matchInfo.participations.map((participation: MatchParticipation) => {
            const { section1, section2, section3 } = parseAttendanceData(participation.attendanceData);
            
            // Check if player is goalkeeper in any section
            const isGoalkeeper = section1.includes('守门') || section2.includes('守门') || section3.includes('守门');
            
            // Find fee override for this player
            const playerFeeOverride = feeOverrides.find((override: FeeOverride) => override.playerId === participation.userId);
            
            // Calculate final fees - use override if available, otherwise use calculated
            let finalFieldFee = roundFee(Number(participation.fieldFeeCalculated));
            let finalVideoFee = roundFee(Number(participation.videoFee));
            let finalLateFee = participation.isLateArrival && Number(participation.totalTime) > 0
              ? roundFee(Number(participation.lateFee))
              : 0;
            let finalTotalFee = finalFieldFee + finalVideoFee + finalLateFee;
            let playerNotes = '';
            let hasOverride = false;
            
            if (playerFeeOverride) {
              hasOverride = true;
              playerNotes = playerFeeOverride.notes || '';
              
              // Calculate override total from components
              finalFieldFee = roundFee(Number(playerFeeOverride.fieldFeeOverride || 0));
              finalVideoFee = roundFee(Number(playerFeeOverride.videoFeeOverride || 0));
              finalLateFee = roundFee(Number(playerFeeOverride.lateFeeOverride || 0));
              finalTotalFee = finalFieldFee + finalVideoFee + finalLateFee;
            }
            
            return {
              id: participation.userId,
              name: participation.user.name,
              section1,
              section2,
              section3,
              total: Number(participation.totalTime),
              fieldFee: finalFieldFee,
              isLate: participation.isLateArrival,
              videoCost: finalVideoFee,
              lateFee: finalLateFee,
              totalCost: finalTotalFee,
              notes: playerNotes,
              isGoalkeeper,
              hasOverride
            };
          });
          
          setGameData(players);
        }
        
        // Transform events to game stats
        const playerStats: { [playerId: string]: { name: string; goals: number; assists: number } } = {};
        
        if (matchInfo.events?.length > 0) {
          matchInfo.events.forEach((event: MatchEvent) => {
            const playerId = event.player.id;
            if (!playerStats[playerId]) {
              playerStats[playerId] = {
                name: event.player.name,
                goals: 0,
                assists: 0
              };
            }
            
            if (event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL') {
              playerStats[playerId].goals++;
            } else if (event.eventType === 'ASSIST') {
              playerStats[playerId].assists++;
            }
          });
        }
        
        const stats: GameStat[] = Object.values(playerStats)
          .filter(stat => stat.goals > 0 || stat.assists > 0);
        
        setGameStats(stats);
        
        // Parse video data
        const videoData = parseVideoData(matchInfo.notes);
        setVideoRecord(videoData);
      } else {
        toast.error('获取比赛数据失败');
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const parseAttendanceData = (attendanceData: AttendanceData) => {
    const attendance = attendanceData?.attendance || {};
    const goalkeeper = attendanceData?.goalkeeper || {};
    
    const section1 = [];
    const section2 = [];
    const section3 = [];
    
    for (let part = 1; part <= 3; part++) {
      // Section 1
      if (goalkeeper['1']?.[part.toString()]) {
        section1.push('守门');
      } else {
        section1.push(attendance['1']?.[part.toString()] || 0);
      }
      
      // Section 2
      if (goalkeeper['2']?.[part.toString()]) {
        section2.push('守门');
      } else {
        section2.push(attendance['2']?.[part.toString()] || 0);
      }
      
      // Section 3
      if (goalkeeper['3']?.[part.toString()]) {
        section3.push('守门');
      } else {
        section3.push(attendance['3']?.[part.toString()] || 0);
      }
    }
    
    return { section1, section2, section3 };
  };

  const parseVideoData = (notes: string | null): VideoRecord | null => {
    if (!notes) return null;
    
    try {
      const parsedNotes = JSON.parse(notes);
      const videoInfo = parsedNotes.video;
      
      if (videoInfo && (videoInfo.url || videoInfo.description)) {
        return {
          fileName: "比赛录像",
          description: videoInfo.description || "通过网盘分享的文件",
          url: videoInfo.url || "",
          extractCode: videoInfo.extractCode || ""
        };
      }
    } catch (error) {
      console.log('Failed to parse video data from notes:', error);
    }
    
    return null;
  };

  const getPlayerStatus = (player: Player): { label: string; color: string } => {
    if (player.total === 0 && !player.isGoalkeeper) {
      return { label: '未参与', color: 'bg-gray-100 text-gray-800' };
    }
    
    // Fixed goalkeeper status logic per requirements
    if (player.isGoalkeeper) {
      return player.isLate 
        ? { label: '迟到', color: 'bg-red-100 text-red-800' }
        : { label: '准时到场', color: 'bg-green-100 text-green-800' };
    }
    
    return player.isLate 
      ? { label: '迟到', color: 'bg-red-100 text-red-800' }
      : { label: '准时到场', color: 'bg-green-100 text-green-800' };
  };

  const renderSection = (sectionData: (number | string)[]) => {
    return (
      <div className="flex gap-1">
        {sectionData.map((value, partIndex) => (
          <div 
            key={partIndex}
            className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded border ${
              value === 1 ? 'bg-green-100 text-green-800 border-green-300' :
              value === 0.5 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
              value === "守门" ? 'bg-blue-100 text-blue-800 border-blue-300' :
              'bg-gray-50 text-gray-400 border-gray-200'
            }`}
          >
            {value === "守门" ? "门" : value || ""}
          </div>
        ))}
      </div>
    );
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

  const getMatchResult = () => {
    if (match?.ourScore !== null && match?.opponentScore !== null) {
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

  const toggleRow = (playerId: string) => {
    setExpandedRows(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">比赛信息不存在</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const matchResult = getMatchResult();
  const totalFieldCost = roundFee(Number(match.fieldFeeTotal || 0)) + roundFee(Number(match.waterFeeTotal || 0));
  const totalActualCost = gameData.reduce((sum, player) => sum + player.totalCost, 0);

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
            返回首页
          </Link>
        </Button>
      </div>

      {/* Match Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                VS {match.opponentTeam}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 text-base">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(match.matchDate)}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  比赛场地
                </div>
              </CardDescription>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold">{matchResult.score}</div>
              <div className={`text-lg font-medium ${matchResult.color}`}>
                {matchResult.result}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                出勤情况
              </CardTitle>
              <CardDescription>
                比赛出勤及费用详情 ({gameData.length} 名球员)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 min-w-12 text-center">#</TableHead>
                      <TableHead className="min-w-20">姓名</TableHead>
                      <TableHead className="min-w-24 text-center">第一节</TableHead>
                      <TableHead className="min-w-24 text-center">第二节</TableHead>
                      <TableHead className="min-w-24 text-center">第三节</TableHead>
                      <TableHead className="min-w-16 text-center">状态</TableHead>
                      <TableHead className="min-w-20 text-center">费用</TableHead>
                      <TableHead className="w-8 min-w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          暂无出勤数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      gameData.map((player, index) => {
                        const status = getPlayerStatus(player);
                        const isExpanded = expandedRows.includes(player.id);
                        
                        return (
                          <React.Fragment key={player.id}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleRow(player.id)}
                            >
                              <TableCell className="font-medium text-center">{index + 1}</TableCell>
                              <TableCell className="font-medium">{player.name}</TableCell>
                              <TableCell className="text-center">
                                {renderSection(player.section1)}
                              </TableCell>
                              <TableCell className="text-center">
                                {renderSection(player.section2)}
                              </TableCell>
                              <TableCell className="text-center">
                                {renderSection(player.section3)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={status.color}>
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                ¥{roundFee(Number(player.totalCost || 0))}
                              </TableCell>
                              <TableCell className="text-center">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${player.id}-details`} className="bg-muted/25">
                                <TableCell colSpan={8}>
                                  <div className="py-4 space-y-3">
                                    <h4 className="font-medium text-sm">详细费用明细</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">出场时间:</span>
                                        <div className="font-medium">{Number(player.total || 0).toFixed(1)} 个时间单位</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">场地费用:</span>
                                        <div className="font-medium">¥{roundFee(Number(player.fieldFee || 0))}</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">录像费用:</span>
                                        <div className="font-medium">¥{roundFee(Number(player.videoCost || 0))}</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">迟到罚款:</span>
                                        <div className="font-medium">¥{roundFee(Number(player.lateFee || 0))}</div>
                                      </div>
                                    </div>
                                    {player.notes && (
                                      <div>
                                        <span className="text-muted-foreground text-sm">备注:</span>
                                        <div className="text-sm mt-1">{player.notes}</div>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Game Stats */}
          {gameStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  比赛数据统计
                </CardTitle>
                <CardDescription>
                  进球和助攻统计
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="font-medium">{stat.name}</div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-green-600">{stat.goals}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-blue-600">{stat.assists}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                费用统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">场地费用:</span>
                  <span className="font-medium">¥{roundFee(Number(match.fieldFeeTotal || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">水费:</span>
                  <span className="font-medium">¥{roundFee(Number(match.waterFeeTotal || 0))}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">总成本:</span>
                  <span className="font-bold">¥{roundFee(totalFieldCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">实收金额:</span>
                  <span className="font-bold text-green-600">¥{roundFee(totalActualCost)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">盈亏:</span>
                  <span className={`font-bold ${totalActualCost >= totalFieldCost ? 'text-green-600' : 'text-red-600'}`}>
                    ¥{roundFee(totalActualCost - totalFieldCost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Section */}
          {videoRecord && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  比赛录像
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{videoRecord.fileName}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {videoRecord.description}
                  </p>
                </div>
                
                {videoRecord.url && (
                  <Button asChild className="w-full">
                    <a 
                      href={videoRecord.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Video className="mr-2 h-4 w-4" />
                      观看录像
                    </a>
                  </Button>
                )}
                
                {videoRecord.extractCode && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">提取码:</div>
                    <div className="font-mono font-bold text-lg">
                      {videoRecord.extractCode}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
