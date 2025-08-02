/**
 * 简单的WebSocket服务器实现
 * 用于处理飞行棋游戏的房间和游戏逻辑
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 创建HTTP服务器，提供静态文件服务
const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  
  // 如果请求的是根路径，则返回index.html
  if (filePath === './') {
    filePath = './index.html';
  }
  
  // 获取文件扩展名
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.svg': 'application/image/svg+xml'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // 文件未找到
        fs.readFile('./404.html', (err, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // 服务器错误
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    } else {
      // 成功返回文件
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// 使用WebSocket处理游戏逻辑
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: server });

// 存储房间信息
const rooms = new Map();

// 处理WebSocket连接
wss.on('connection', (ws) => {
  console.log('新客户端连接');
  
  // 处理消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (e) {
      console.error('解析消息失败:', e);
    }
  });
  
  // 连接关闭
  ws.on('close', () => {
    console.log('客户端断开连接');
    // 处理玩家断开连接的逻辑
  });
});

/**
 * 处理WebSocket消息
 */
function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'create_room':
      createRoom(ws, data);
      break;
    case 'join_room':
      joinRoom(ws, data);
      break;
    case 'start_game':
      startGame(ws, data);
      break;
    default:
      console.log('未知消息类型:', data.type);
  }
}

/**
 * 创建房间
 */
function createRoom(ws, data) {
  const roomId = data.roomId;
  const playerId = data.playerId;
  
  // 创建新房间
  const room = {
    id: roomId,
    players: [{
      id: playerId,
      ws: ws,
      isOwner: true,
      color: 'red' // 房主默认为红色
    }],
    status: 'waiting', // waiting, playing
    maxPlayers: 2
  };
  
  rooms.set(roomId, room);
  
  // 发送房间创建成功的消息
  ws.send(JSON.stringify({
    type: 'room_created',
    roomId: roomId
  }));
  
  console.log(`房间 ${roomId} 已创建，房主: ${playerId}`);
}

/**
 * 加入房间
 */
function joinRoom(ws, data) {
  const roomId = data.roomId;
  const playerId = data.playerId;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    // 房间不存在
    ws.send(JSON.stringify({
      type: 'room_joined',
      success: false,
      reason: '房间不存在'
    }));
    return;
  }
  
  if (room.players.length >= room.maxPlayers) {
    // 房间已满
    ws.send(JSON.stringify({
      type: 'room_joined',
      success: false,
      reason: '房间已满'
    }));
    return;
  }
  
  // 分配颜色给新玩家 (蓝色)
  const newPlayer = {
    id: playerId,
    ws: ws,
    isOwner: false,
    color: 'blue'
  };
  
  room.players.push(newPlayer);
  
  // 通知新玩家加入成功
  ws.send(JSON.stringify({
    type: 'room_joined',
    success: true,
    roomId: roomId,
    players: room.players.map(p => ({ id: p.id, isOwner: p.isOwner }))
  }));
  
  // 通知房间内所有玩家有新玩家加入
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'player_joined',
        roomId: roomId,
        players: room.players.map(p => ({ id: p.id, isOwner: p.isOwner }))
      }));
    }
  });
  
  console.log(`玩家 ${playerId} 加入房间 ${roomId}`);
}

/**
 * 开始游戏
 */
function startGame(ws, data) {
  const roomId = data.roomId;
  const room = rooms.get(roomId);
  
  if (!room) {
    return;
  }
  
  // 检查是否为房主
  const owner = room.players.find(player => player.isOwner);
  if (!owner || owner.ws !== ws) {
    return;
  }
  
  // 更新房间状态
  room.status = 'playing';
  
  // 通知所有玩家游戏开始
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'game_started',
        roomId: roomId
      }));
    }
  });
  
  console.log(`房间 ${roomId} 游戏开始`);
}

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

console.log('飞行棋游戏服务器已启动');