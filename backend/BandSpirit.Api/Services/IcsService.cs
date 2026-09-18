using Ical.Net;
using Ical.Net.CalendarComponents;
using Ical.Net.DataTypes;
using Ical.Net.Serialization;
using BandSpirit.Api.Models;

namespace BandSpirit.Api.Services;

/// <summary>
/// Erstellt ICS-Kalendereinträge (iCalendar) für Meetings.
/// </summary>
public class IcsService
{
    /// <summary>Erzeugt einen ICS-String für das angegebene Meeting.</summary>
    public string CreateMeetingIcs(S3Meeting meeting)
    {
        var start = meeting.ScheduledAt ?? DateTime.UtcNow;
        var kalender = new Calendar();
        var termin = new CalendarEvent
        {
            Uid = meeting.Id.ToString(),
            Summary = meeting.Title,
            Description = $"Meeting-Typ: {meeting.Typ}",
            Start = new CalDateTime(start.ToUniversalTime()),
            End = new CalDateTime(start.ToUniversalTime().AddHours(1))
        };
        kalender.Events.Add(termin);

        var serializer = new CalendarSerializer();
        return serializer.SerializeToString(kalender);
    }
}
