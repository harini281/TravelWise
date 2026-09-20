FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/TravelWise.API/TravelWise.API.csproj ./
RUN dotnet restore TravelWise.API.csproj
COPY backend/TravelWise.API/ ./
RUN dotnet publish TravelWise.API.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app/publish ./
USER $APP_UID
EXPOSE 10000
CMD ["sh", "-c", "exec dotnet TravelWise.API.dll --urls http://0.0.0.0:${PORT:-10000}"]
