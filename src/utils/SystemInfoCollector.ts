import { crypto } from '@std/crypto';
import type { SystemInfo } from '../benchmarks/types.ts';

/**
Collects system information for benchmark context
*/
export class SystemInfoCollector
{
  /**
  Get comprehensive system information
  */
  static async getSystemInfo(): Promise<SystemInfo>
  {
    const platform = Deno.build.os;
    const arch = Deno.build.arch;
    const hostname = Deno.hostname();

    const cpu = await this.getCpuInfo();
    const memoryGb = await this.getTotalMemory();
    const freeMemoryGb = await this.getFreeMemory();
    const osVersion = await this.getOsVersion();

    const machineId = await this.generateMachineId({
      platform,
      arch,
      hostname,
      cpu,
      osVersion,
    });

    return {
      platform,
      arch,
      cpu,
      memoryGb,
      freeMemoryGb,
      hostname,
      osVersion,
      machineId,
    };
  }

  /**
  Get CPU information
  */
  private static async getCpuInfo(): Promise<string>
  {
    try
    {
      if (Deno.build.os === 'darwin')
      {
        const cmd = new Deno.Command('sysctl', {
          args: ['-n', 'machdep.cpu.brand_string'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        return new TextDecoder().decode(stdout).trim();
      }
      else if (Deno.build.os === 'linux')
      {
        const cmd = new Deno.Command('sh', {
          args: ['-c', 'cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        return new TextDecoder().decode(stdout).trim();
      }
      else if (Deno.build.os === 'windows')
      {
        const cmd = new Deno.Command('wmic', {
          args: ['cpu', 'get', 'name', '/value'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const output = new TextDecoder().decode(stdout);
        const match = output.match(/Name=(.+)/);
        return match ? match[1].trim() : 'Unknown CPU';
      }
    }
    catch (error: unknown)
    {
      console.warn('Could not get CPU info:', error);
    }
    return 'Unknown CPU';
  }

  /**
  Get total system memory in GB
  */
  private static async getTotalMemory(): Promise<number>
  {
    try
    {
      if (Deno.build.os === 'darwin')
      {
        const cmd = new Deno.Command('sysctl', {
          args: ['-n', 'hw.memsize'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const bytes = parseInt(new TextDecoder().decode(stdout).trim());
        return Math.round(bytes / (1024 * 1024 * 1024));
      }
      else if (Deno.build.os === 'linux')
      {
        const cmd = new Deno.Command('sh', {
          args: ['-c', "cat /proc/meminfo | grep MemTotal | awk '{print $2}'"],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const kb = parseInt(new TextDecoder().decode(stdout).trim());
        return Math.round(kb / (1024 * 1024));
      }
      else if (Deno.build.os === 'windows')
      {
        const cmd = new Deno.Command('wmic', {
          args: ['computersystem', 'get', 'TotalPhysicalMemory', '/value'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const output = new TextDecoder().decode(stdout);
        const match = output.match(/TotalPhysicalMemory=(\d+)/);
        if (match)
        {
          const bytes = parseInt(match[1]);
          return Math.round(bytes / (1024 * 1024 * 1024));
        }
      }
    }
    catch (error: unknown)
    {
      console.warn('Could not get total memory:', error);
    }
    return 0;
  }

  /**
  Get available system memory in GB
  */
  private static async getFreeMemory(): Promise<number>
  {
    try
    {
      if (Deno.build.os === 'darwin')
      {
        const cmd = new Deno.Command('vm_stat', {
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const output = new TextDecoder().decode(stdout);
        const pageSize = 4096; // Default page size on macOS
        const freeMatch = output.match(/Pages free:\s+(\d+)/);
        const inactiveMatch = output.match(/Pages inactive:\s+(\d+)/);

        if (freeMatch && inactiveMatch)
        {
          const freePages = parseInt(freeMatch[1]);
          const inactivePages = parseInt(inactiveMatch[1]);
          const freeBytes = (freePages + inactivePages) * pageSize;
          return Math.round(freeBytes / (1024 * 1024 * 1024));
        }
      }
      else if (Deno.build.os === 'linux')
      {
        const cmd = new Deno.Command('sh', {
          args: ['-c', "cat /proc/meminfo | grep MemAvailable | awk '{print $2}'"],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const kb = parseInt(new TextDecoder().decode(stdout).trim());
        return Math.round(kb / (1024 * 1024));
      }
      else if (Deno.build.os === 'windows')
      {
        const cmd = new Deno.Command('wmic', {
          args: ['OS', 'get', 'FreePhysicalMemory', '/value'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const output = new TextDecoder().decode(stdout);
        const match = output.match(/FreePhysicalMemory=(\d+)/);
        if (match)
        {
          const kb = parseInt(match[1]);
          return Math.round(kb / (1024 * 1024));
        }
      }
    }
    catch (error: unknown)
    {
      console.warn('Could not get free memory:', error);
    }
    return 0;
  }

  /**
  Get OS version information
  */
  private static async getOsVersion(): Promise<string | undefined>
  {
    try
    {
      if (Deno.build.os === 'darwin')
      {
        const cmd = new Deno.Command('sw_vers', {
          args: ['-productVersion'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        return `macOS ${new TextDecoder().decode(stdout).trim()}`;
      }
      else if (Deno.build.os === 'linux')
      {
        try
        {
          const cmd = new Deno.Command('lsb_release', {
            args: ['-d'],
            stdout: 'piped',
            stderr: 'piped',
          });
          const { stdout } = await cmd.output();
          const output = new TextDecoder().decode(stdout);
          const match = output.match(/Description:\s+(.+)/);
          return match ? match[1].trim() : undefined;
        }
        catch
        {
          // Try /etc/os-release as fallback
          const cmd = new Deno.Command('sh', {
            args: ['-c', 'cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2'],
            stdout: 'piped',
            stderr: 'piped',
          });
          const { stdout } = await cmd.output();
          const output = new TextDecoder().decode(stdout).trim();
          return output.replace(/"/g, '') || undefined;
        }
      }
      else if (Deno.build.os === 'windows')
      {
        const cmd = new Deno.Command('wmic', {
          args: ['os', 'get', 'Caption', '/value'],
          stdout: 'piped',
          stderr: 'piped',
        });
        const { stdout } = await cmd.output();
        const output = new TextDecoder().decode(stdout);
        const match = output.match(/Caption=(.+)/);
        return match ? match[1].trim() : undefined;
      }
    }
    catch (error: unknown)
    {
      console.warn('Could not get OS version:', error);
    }
    return undefined;
  }

  /**
  Generate a unique machine identifier
  */
  private static async generateMachineId(components: {
    platform: string;
    arch: string;
    hostname: string;
    cpu: string;
    osVersion?: string;
  }): Promise<string>
  {
    // Combine components for a stable machine ID
    const idString = [
      components.platform,
      components.arch,
      components.hostname.toLowerCase(),
      components.cpu.toLowerCase().replace(/\s+/g, '-'),
      components.osVersion || 'unknown',
    ].join('-');

    // Create a hash for a shorter, consistent ID
    const encoder = new TextEncoder();
    const data = encoder.encode(idString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Return a readable format with platform info and hash
    return `${components.platform}-${components.arch}-${hashHex.substring(0, 8)}`;
  }

  /**
  Get a filesystem label based on the path
  */
  static getFilesystemLabel(path: string): string
  {
    // This is a simple implementation - could be enhanced with actual mount point detection
    if (path.includes('/Volumes/'))
    {
      const match = path.match(/\/Volumes\/([^/]+)/);
      return match ? match[1] : 'External Volume';
    }
    else if (path.startsWith('/mnt/'))
    {
      const match = path.match(/\/mnt\/([^/]+)/);
      return match ? `Mount: ${match[1]}` : 'Mounted Volume';
    }
    else if (path.startsWith('/tmp') || path.includes('/tmp/'))
    {
      return 'Temp Storage';
    }
    else if (path.startsWith('/home') || path.startsWith('/Users'))
    {
      return 'User Storage';
    }
    else if (Deno.build.os === 'windows' && path.match(/^[A-Z]:/))
    {
      return `Drive ${path[0]}`;
    }
    else
    {
      return 'System Storage';
    }
  }
}
