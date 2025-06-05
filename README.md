# Minecraft Server Web Console

A modern, real-time web interface for managing your Minecraft server with Docker support.

## Features

- **Real-time Console**: Live server output with WebSocket connection
- **Server Control**: Start, stop, and restart your Minecraft server
- **Command Interface**: Send commands directly to the server
- **Server Statistics**: Monitor players, memory usage, and uptime
- **Quick Commands**: Pre-configured buttons for common tasks
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Ready**: Easy deployment with Docker Compose

## Prerequisites

- Docker and Docker Compose
- At least 4GB RAM (2GB for Minecraft, 2GB for system)
- Port 3000 (web console) and 25565 (Minecraft) available

## Quick Start

1. **Clone or download** this project to your server

2. **Run the setup script**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure your settings** in `.env` file:
   ```bash
   nano .env
   ```

4. **Start the services**:
   ```bash
   docker-compose up -d
   ```

5. **Access the web console**:
   Open `http://your-server-ip:3000` in your browser

## Manual Setup

If you prefer manual setup:

### 1. Create Directory Structure
```bash
mkdir minecraft-console
cd minecraft-console
mkdir minecraft public
```

### 2. Download Minecraft Server
```bash
cd minecraft
# Download your preferred Minecraft server version
wget https://piston-data.mojang.com/v1/objects/84194a2f286ef7c14ed7ce0090dba59902951553/server.jar
```

### 3. Accept EULA
```bash
echo "eula=true" > eula.txt
```

### 4. Create Configuration Files
- Copy all the provided files to their respective locations
- Edit `.env` with your preferred settings
- Modify `server.properties` as needed

### 5. Build and Run
```bash
docker-compose up -d
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | production | Node.js environment |
| `PORT` | 3000 | Web console port |
| `MINECRAFT_SERVER_PATH` | /minecraft | Path to Minecraft server files |
| `MINECRAFT_JAR` | server.jar | Minecraft server jar filename |
| `JAVA_XMS` | 1G | Initial Java heap size |
| `JAVA_XMX` | 4G | Maximum Java heap size |

### Server Properties

Edit `minecraft/server.properties` to configure your Minecraft server:

```properties
server-port=25565
gamemode=survival
difficulty=easy
max-players=20
motd=Your Server Message
```

## Usage

### Web Interface

1. **Server Control**: Use Start/Stop/Restart buttons
2. **Command Input**: Type commands in the input field
3. **Quick Commands**: Click preset command buttons
4. **Real-time Logs**: Monitor server output in the console
5. **Statistics**: View player count, memory usage, and uptime

### Common Commands

- `list` - Show online players
- `help` - Display available commands
- `op <player>` - Give operator permissions
- `gamemode creative <player>` - Set creative mode
- `time set day` - Set time to day
- `weather clear` - Clear weather

## File Structure

```
minecraft-console/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── server.js
├── .env
├── setup.sh
├── public/
│   └── index.html
└── minecraft/
    ├── server.jar
    ├── server.properties
    ├── eula.txt
    └── world/
```

## Ports

- **3000**: Web console interface
- **25565**: Minecraft server (default)

## Security Considerations

1. **Firewall**: Only expose necessary ports
2. **Authentication**: Consider adding authentication for production
3. **HTTPS**: Use a reverse proxy (nginx) for HTTPS in production
4. **Updates**: Keep Docker images and server software updated

## Troubleshooting

### Server Won't Start
- Check if Java is installed in the container
- Verify server.jar exists and is valid
- Check memory settings in .env
- Review logs: `docker-compose logs minecraft-console`

### Web Console Not Loading
- Verify port 3000 is accessible
- Check Docker container status: `docker-compose ps`
- Review application logs

### Commands Not Working
- Ensure server is online (green status indicator)
- Check WebSocket connection (top-right indicator)
- Verify command syntax

## Advanced Configuration

### Custom Server Version

1. Download your preferred server version to `minecraft/server.jar`
2. Update `MINECRAFT_JAR` in `.env` if using different filename

### Memory Optimization

Adjust Java memory settings in `.env`:
```bash
JAVA_XMS=2G  # Starting memory
JAVA_XMX=6G  # Maximum memory
```

### Reverse Proxy Setup

For production with nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Docker and application logs
3. Verify your configuration files
4. Ensure system requirements are met

## License

This project is open source. Feel free to modify and distribute according to your needs.