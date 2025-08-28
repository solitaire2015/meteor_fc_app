-- Football Club Database Schema
-- Run this in Supabase SQL Editor

-- Create enum for game status
CREATE TYPE game_status AS ENUM ('FINISHED', 'UPCOMING');

-- Create players table
CREATE TABLE players (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    team TEXT NOT NULL DEFAULT 'Football Club',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE games (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    opponent TEXT NOT NULL,
    result TEXT NOT NULL,
    status game_status NOT NULL DEFAULT 'FINISHED',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create game_players junction table
CREATE TABLE game_players (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "gameId" TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    "playerId" TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    section1 DOUBLE PRECISION NOT NULL DEFAULT 0,
    section2 DOUBLE PRECISION NOT NULL DEFAULT 0,
    section3 DOUBLE PRECISION NOT NULL DEFAULT 0,
    total DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTime" BOOLEAN NOT NULL DEFAULT true,
    "videoCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("gameId", "playerId")
);

-- Create monthly_stats table
CREATE TABLE monthly_stats (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

-- Create indexes for better performance
CREATE INDEX idx_games_date ON games(date DESC);
CREATE INDEX idx_game_players_game ON game_players("gameId");
CREATE INDEX idx_game_players_player ON game_players("playerId");
CREATE INDEX idx_monthly_stats_year_month ON monthly_stats(year DESC, month DESC);

-- Insert sample data
-- Players
INSERT INTO players (name, initials, team) VALUES
('小陶', 'XT', 'Football Club'),
('得瑞克', 'DRK', 'Football Club'),
('小贾', 'XJ', 'Football Club'),
('肖老师', 'XLS', 'Football Club'),
('曦哥', 'XG', 'Football Club'),
('小马', 'XM', 'Football Club'),
('小刘', 'XL', 'Football Club'),
('小罗', 'XR', 'Football Club'),
('元帅', 'YS', 'Football Club'),
('老狼', 'LL', 'Football Club'),
('大赵', 'DZ', 'Football Club'),
('东辉', 'DH', 'Football Club'),
('冷', 'L', 'Football Club');

-- Sample games
INSERT INTO games (date, opponent, result, status) VALUES
('2025-08-23', '十七苝', '3:5', 'FINISHED'),
('2025-08-16', 'FYL', '2:1', 'FINISHED'),
('2025-08-09', '雷霆', '4:2', 'FINISHED'),
('2025-08-02', '星辰', '1:3', 'FINISHED'),
('2025-08-30', '飞鹰', '--', 'UPCOMING');

-- Sample monthly stats
INSERT INTO monthly_stats (year, month, "gamesPlayed", wins, draws, losses, "goalsFor", "goalsAgainst") VALUES
(2025, 8, 4, 2, 0, 2, 10, 11),
(2025, 7, 3, 1, 1, 1, 6, 5),
(2025, 6, 2, 2, 0, 0, 8, 2),
(2024, 12, 5, 3, 1, 1, 15, 8);

-- Sample game player stats (for first game)
INSERT INTO game_players ("gameId", "playerId", goals, assists, section1, section2, section3, total, "fieldFee", "onTime", "videoCost", "totalCost", notes)
SELECT 
    g.id,
    p.id,
    CASE p.name 
        WHEN '小陶' THEN 2
        WHEN '得瑞克' THEN 1
        ELSE 0
    END,
    CASE p.name 
        WHEN '小陶' THEN 1
        WHEN '得瑞克' THEN 2
        ELSE 0
    END,
    1, 1, 0.5, 2.5, 64, true, 68, 132,
    CASE p.name 
        WHEN '小陶' THEN '进球2'
        WHEN '得瑞克' THEN '进球1 助攻2'
        ELSE ''
    END
FROM games g, players p 
WHERE g.opponent = '十七苝' AND p.name IN ('小陶', '得瑞克')
LIMIT 2;