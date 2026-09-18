namespace BandSpirit.Api.DTOs.Common;

/// <summary>
/// Generische OData-konforme Sammelantwort (@odata.count + value).
/// </summary>
/// <typeparam name="T">Elementtyp.</typeparam>
public class ODataResponse<T>
{
    /// <summary>Gesamtanzahl (bei $count=true).</summary>
    public long Count { get; set; }

    /// <summary>Die zurückgelieferten Elemente.</summary>
    public IEnumerable<T> Value { get; set; } = new List<T>();
}
