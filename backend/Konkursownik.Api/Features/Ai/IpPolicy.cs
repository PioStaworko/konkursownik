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
            // Ranges that embed an IPv4 address (or tunnel to one) are blocked outright.
            var firstEightZero = b.Take(8).All(x => x == 0);
            return !(ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast
                || (b[0] & 0xFE) == 0xFC                                                  // fc00::/7 unique-local
                || b.Take(12).All(x => x == 0)                                            // ::/96 unspecified, loopback, IPv4-compatible
                || (firstEightZero && b[8] == 0xFF && b[9] == 0xFF && b[10] == 0 && b[11] == 0) // ::ffff:0:0:0/96 IPv4-translated
                || (b[0] == 0 && b[1] == 0x64 && b[2] == 0xFF && b[3] == 0x9B
                    && ((b[4] == 0 && b[5] == 0 && b[6] == 0 && b[7] == 0 && b[8] == 0 && b[9] == 0 && b[10] == 0 && b[11] == 0) // 64:ff9b::/96
                        || (b[4] == 0 && b[5] == 1)))                                     // 64:ff9b:1::/48
                || (b[0] == 0x20 && b[1] == 0x02)                                         // 2002::/16 6to4
                || (b[0] == 0x20 && b[1] == 0x01 && b[2] == 0 && b[3] == 0));             // 2001::/32 Teredo
        }
        return false;
    }
}
