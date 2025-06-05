#!/bin/bash

# Minecraft Server Console Setup Script
echo "Setting up Minecraft Server Console..."

# Create necessary directories
mkdir -p minecraft
mkdir -p public

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please edit it with your configuration."
fi

# Create minecraft directory structure
cd minecraft

# Download server.jar if it doesn't exist
if [ ! -f server.jar ]; then
    echo "Downloading Minecraft server..."
    # Replace this URL with the version you want
    wget https://piston-data.mojang.com/v1/objects/84194a2f286ef7c14ed7ce0090dba59902951553/server.jar
    echo "Downloaded server.jar"
fi

# Create server.properties if it doesn't exist
if [ ! -f server.properties ]; then
    cat > server.properties << EOL
#Minecraft server properties
server-port=25565
gamemode=survival
difficulty=easy
spawn-protection=16
max-players=20
online-mode=true
white-list=false
motd=A Minecraft Server managed by Web Console
enable-rcon=false
rcon.password=
rcon.port=25575
spawn-monsters=true
spawn-animals=true
spawn-npcs=true
allow-flight=false
level-name=world
level-seed=
level-type=default
max-build-height=256
view-distance=10
EOL
    echo "Created default server.properties"
fi

# Accept EULA
if [ ! -f eula.txt ]; then
    echo "eula=true" > eula.txt
    echo "Accepted EULA"
fi

cd ..

echo "Setup complete!"
echo ""
echo "To start the console:"
echo "1. Edit .env file with your preferred settings"
echo "2. Run: docker-compose up -d"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "To view logs:"
echo "docker-compose logs -f minecraft-console"