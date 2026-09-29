using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Fleck;
using Windows.Media.Control;

class Program
{
    private static List<IWebSocketConnection> allSockets = new List<IWebSocketConnection>();
    private static volatile bool isLivelyRunning = false;
    private static GlobalSystemMediaTransportControlsSessionManager sessionManager = null;

    static async Task Main(string[] args)
    {
        // 1. Khoi tao Windows Media Session Manager
        try
        {
            sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        }
        catch { }

        // 2. Khoi dong WebSocket Server (Ho tro nhan lenh 2 chieu)
        var server = new WebSocketServer("ws://127.0.0.1:8181");
        server.Start(socket =>
        {
            socket.OnOpen = () => allSockets.Add(socket);
            socket.OnClose = () => allSockets.Remove(socket);

            // Nhan lenh tu hinh nen Lively Wallpaper
            socket.OnMessage = async message =>
            {
                try
                {
                    using var doc = JsonDocument.Parse(message);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("action", out var actionProp))
                    {
                        string action = actionProp.GetString();
                        var currentSession = sessionManager?.GetCurrentSession();
                        if (currentSession != null)
                        {
                            switch (action)
                            {
                                case "seek":
                                    if (root.TryGetProperty("position", out var posProp))
                                    {
                                        double targetSeconds = posProp.GetDouble();
                                        await currentSession.TryChangePlaybackPositionAsync((long)TimeSpan.FromSeconds(targetSeconds).Ticks);
                                    }
                                    break;
                                case "togglePlayPause":
                                    await currentSession.TryTogglePlayPauseAsync();
                                    break;
                                case "next":
                                    await currentSession.TrySkipNextAsync();
                                    break;
                                case "previous":
                                    await currentSession.TrySkipPreviousAsync();
                                    break;
                            }
                        }
                    }
                }
                catch { }
            };
        });

        // 3. Chay task giam sat Lively lien tuc
        _ = Task.Run(MonitorLivelyProcessAsync);

        // 4. Vong lap cap nhat timeline
        while (true)
        {
            if (isLivelyRunning && allSockets.Count > 0)
            {
                try
                {
                    if (sessionManager == null)
                    {
                        sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
                    }

                    var currentSession = sessionManager?.GetCurrentSession();
                    if (currentSession != null)
                    {
                        var timeline = currentSession.GetTimelineProperties();
                        var playbackInfo = currentSession.GetPlaybackInfo();

                        double currentPos = timeline.Position.TotalSeconds;

                        if (playbackInfo.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                        {
                            var timeSinceUpdate = (DateTimeOffset.UtcNow - timeline.LastUpdatedTime).TotalSeconds;
                            if (timeSinceUpdate > 0)
                            {
                                currentPos += timeSinceUpdate;
                            }
                        }

                        if (timeline.EndTime.TotalSeconds > 0 && currentPos > timeline.EndTime.TotalSeconds)
                        {
                            currentPos = timeline.EndTime.TotalSeconds;
                        }

                        var payload = new
                        {
                            position = currentPos,
                            duration = timeline.EndTime.TotalSeconds,
                            status = playbackInfo.PlaybackStatus.ToString()
                        };

                        string json = JsonSerializer.Serialize(payload);

                        foreach (var socket in allSockets.ToArray())
                        {
                            if (socket.IsAvailable)
                            {
                                socket.Send(json);
                            }
                        }
                    }
                }
                catch { }

                await Task.Delay(50);
            }
            else
            {
                await Task.Delay(1000);
            }
        }
    }

    private static async Task MonitorLivelyProcessAsync()
    {
        while (true)
        {
            try
            {
                var livelyProcesses = Process.GetProcessesByName("Lively")
                    .Concat(Process.GetProcessesByName("Lively.UI.WinUI"))
                    .Concat(Process.GetProcessesByName("livelywp"))
                    .ToArray();

                isLivelyRunning = (livelyProcesses.Length > 0);
            }
            catch
            {
                isLivelyRunning = false;
            }

            await Task.Delay(2000);
        }
    }
}