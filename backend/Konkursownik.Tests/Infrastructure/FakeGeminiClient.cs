using System.Text.Json;
using System.Text.Json.Nodes;
using Konkursownik.Api.Features.Ai;

namespace Konkursownik.Tests.Infrastructure;

/// <summary>Queue of canned responses or exceptions; records every call.</summary>
public class FakeGeminiClient : IGeminiClient
{
    private readonly Queue<object?> _queue = new();

    public List<(string Prompt, IReadOnlyList<GeminiPart> Parts, JsonObject Schema)> Calls { get; } = [];

    public void EnqueueJson(string json) => _queue.Enqueue(JsonDocument.Parse(json).RootElement.Clone());
    public void EnqueueNull() => _queue.Enqueue(null);
    public void EnqueueException(Exception ex) => _queue.Enqueue(ex);

    public Task<JsonElement?> GenerateJsonAsync(string prompt, IReadOnlyList<GeminiPart> parts, JsonObject responseSchema, CancellationToken ct)
    {
        Calls.Add((prompt, parts, responseSchema));
        if (_queue.Count == 0) throw new InvalidOperationException("FakeGeminiClient: no response queued.");
        return _queue.Dequeue() switch
        {
            Exception ex => Task.FromException<JsonElement?>(ex),
            JsonElement el => Task.FromResult<JsonElement?>(el),
            _ => Task.FromResult<JsonElement?>(null),
        };
    }
}
