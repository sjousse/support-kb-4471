<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, PROBLEMS } from '#lib/kb/problems';

  let { ticket, repo }: { ticket: number; repo: string } = $props();

  const result = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const fmt = (o: Record<string, number>) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{result.unique}</strong> reports merged into #{ticket} ({result.rows} rows in the export; a report counts once) ·
  <strong>{result.groups.length}</strong> {result.groups.length === 1 ? 'problem' : 'problems'} · counted as the desk files them
</p>

<table>
  <thead>
    <tr><th>ticket</th><th>problem</th><th>reports</th><th>tenants</th><th>intake tagged as</th><th>seen</th></tr>
  </thead>
  <tbody>
    {#each result.groups as g (g.problem)}
      {@const p = PROBLEMS[g.problem]}
      <tr>
        <td>{#if p.issue}<a href="https://github.com/{repo}/issues/{p.issue}">{repo}#{p.issue}</a>{:else}none{/if}</td>
        <td><b>{p.title}</b><br /><span class="what">{p.what}</span></td>
        <td class="n">{g.reports.length}{#if result.alsoIn(g.problem)}<br /><span class="tags">{result.alsoIn(g.problem)} also in the one-day move</span>{/if}</td>
        <td>{g.tenants.length}</td>
        <td class="tags">{fmt(g.taggedAs)}</td>
        <td class="tags">{g.firstSeen} → {g.lastSeen}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .what, .tags { color: var(--muted); font-size: 0.85em; }
  .n { font-weight: 600; }
</style>
