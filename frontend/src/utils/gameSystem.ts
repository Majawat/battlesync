/**
 * Format game system codes into human-readable names
 */
export function formatGameSystem(systemCode: string | undefined): string {
  if (!systemCode) return 'Grimdark Future';
  
  const systemMap: Record<string, string> = {
    'gf': 'Grimdark Future',
    'grimdark-future': 'Grimdark Future', 
    'aof': 'Age of Fantasy',
    'age-of-fantasy': 'Age of Fantasy',
    'aw': 'Warfleets',
    'warfleets': 'Warfleets'
  };
  
  return systemMap[systemCode.toLowerCase()] || 'Grimdark Future';
}