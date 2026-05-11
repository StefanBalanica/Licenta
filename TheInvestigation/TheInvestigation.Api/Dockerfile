FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Install libgdiplus (System.Drawing.Common) + fonts for QuestPDF PDF rendering on Linux
RUN apt-get update && apt-get install -y \
    libgdiplus \
    libc6-dev \
    fontconfig \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["TheInvestigation.Api.csproj", "."]
RUN dotnet restore "./TheInvestigation.Api.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "TheInvestigation.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TheInvestigation.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TheInvestigation.Api.dll"]
