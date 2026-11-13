using System.Net;
using System.Net.Sockets;

namespace Konkursownik.Api.Features.Ai;

/// <summary>Decides which destination addresses the server may connect to when fetching user-supplied URLs (SSRF guard).</summary>
public static class IpPolicy
{
    /// <summary>True only for globally routable unicast addresses.</summary>
    public static bool IsPublic(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (IPAddress.IsLoopback(ip)) return false;

        var b = ip.GetAddressBytes();
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            return !(b[0] == 0                                   // 0.0.0.0/8
                || b[0] == 10                                    // 10/8
                || (b[0] == 100 && (b[1] & 0xC0) == 64)          // 100.64/10 CGNAT
                || (b[0] == 169 && b[1] == 254)                  // link-local
                || (b[0] == 172 && (b[1] & 0xF0) == 16)          // 172.16/12
                || (b[0] == 192 && b[1] == 168)                  // 192.168/16
                || b[0] >= 224);                                 // multicast, reserved, broadcast
        }
        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return !(ip.Equals(IPAddress.IPv6None) || ip.Equals(IPAddress.IPv6Any)
                || ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast
                || (b[0] & 0xFE) == 0xFC);                       // fc00::/7 unique-local
        }
        return false;
    }
}
