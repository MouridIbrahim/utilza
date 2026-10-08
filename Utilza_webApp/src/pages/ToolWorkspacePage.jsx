import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button3D } from '../components/ui/Button3D.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { Skeleton, CardSkeletonGrid } from '../components/feedback/Skeleton.jsx';
import { useToolQuery, useToolsQuery } from '../hooks/useCatalogQueries.js';
import { trackEvent } from '../services/analytics-service.js';
import { formatBytes } from '../services/tool-service.js';
import {
  getToolDefinition,
  isFrontendTool,
  validateFiles,
  validateParams,
} from '../features/tool-workspace/tool-definitions.js';
import { useToolExecution } from '../features/tool-workspace/hooks/useToolExecution.js';
import { ToolHero } from '../features/tool-workspace/components/ToolHero.jsx';
import { ToolLimitations, ToolPrivacyNotice } from '../features/tool-workspace/components/ToolLimitations.jsx';
import { RelatedTools } from '../features/tool-workspace/components/RelatedTools.jsx';
import { FileDropzone } from '../features/tool-workspace/components/FileDropzone.jsx';
import { FileQueue } from '../features/tool-workspace/components/FileQueue.jsx';
import { ToolParameterForm, UrlInputForm } from '../features/tool-workspace/components/ToolParameterForm.jsx';
import { LocalToolBody } from '../features/local-tools/components/LocalToolBody.jsx';
import { ToolResultPanel } from '../features/tool-workspace/components/ToolResultPanel.jsx';
import { categorySlugOf } from '../features/catalog/components/ToolBadgeSet.jsx';
import { ErrorPage } from './ErrorPage.jsx';

export function ToolWorkspacePage() {
  const { slug } = useParams();
  const meta = useToolQuery(slug);
  const tool = meta.data;

  useEffect(() => {
    if (tool?.slug) trackEvent('tool_opened', tool.slug);
  }, [tool?.slug]);

  if (meta.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (meta.isError && (meta.error?.code === 'TOOL_NOT_FOUND' || meta.error?.status === 404)) {
    return <ErrorPage code="404" />;
  }

  if (meta.isError) {
    return (
      <ErrorPanel
        title="Could not load this tool."
        message={meta.error?.message}
        onRetry={() => meta.refetch()}
      />
    );
  }

  if (!tool) return null;

  const catSlug = categorySlugOf(tool);
  return (
    <div className="flex flex-col gap-6">
      <Seo title={`${tool.name} — Utilza`} description={tool.description} />
      <Breadcrumbs
        trail={[
          { label: 'Tools', href: '/tools' },
          ...(catSlug ? [{ label: tool.category?.name || catSlug, href: `/tools/category/${catSlug}` }] : []),
          { label: tool.name },
        ]}
      />
      <ToolHero tool={tool} />
      {isFrontendTool(tool) ? (
        <LocalToolBody tool={tool} />
      ) : (
        <WorkspaceBody tool={tool} />
      )}
    </div>
  );
}

function seedDefaults(def) {
  const out = {};
  for (const f of def?.fields || []) {
    if (f.defaultValue !== undefined && f.defaultValue !== null) {
      out[f.name] = String(f.defaultValue);
    }
  }
  return out;
}

function WorkspaceBody({ tool }) {
  const def = getToolDefinition(tool.slug);
  const related = useToolsQuery({
    category: categorySlugOf(tool),
    page: 1,
    limit: 7,
  });
  const execution = useToolExecution();

  const [files, setFiles] = useState([]);
  const [params, setParams] = useState(() => seedDefaults(getToolDefinition(tool.slug)));
  const [clientErrors, setClientErrors] = useState({});
  const [customProblems, setCustomProblems] = useState([]);
  const [fileProblems, setFileProblems] = useState([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  useEffect(() => {
    setFiles([]);
    setParams(seedDefaults(getToolDefinition(tool.slug)));
    setClientErrors({});
    setCustomProblems([]);
    setFileProblems([]);
    execution.reset?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.slug]);

  const inCooldown = Date.now() < cooldownUntil;

  const acceptHint = useMemo(() => {
    if (!def?.files) return { accept: [], max: 0, maxSize: 0 };
    return { accept: def.files.accept, max: def.files.max, maxSize: def.files.maxSize };
  }, [def]);

  if (!def) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="font-semibold">Workspace unavailable for this tool</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {tool.name} is a server tool without a matching workspace configuration, so this
            page will not guess its inputs. Try the{' '}
            <Link to="/tools" className="underline">full catalog</Link>.
          </p>
        </Card>
        <ToolPrivacyNotice />
        {related.data && <RelatedTools tools={related.data.items} currentSlug={tool.slug} />}
      </div>
    );
  }

  function setParam(name, value) {
    setParams((p) => ({ ...p, [name]: value }));
    setClientErrors((e) => ({ ...e, [name]: undefined }));
  }

  function onRun() {
    if (execution.isPending || inCooldown) return;
    const perrors = validateParams(def, params);
    const fproblems = def.files ? validateFiles(def, files) : [];
    const cproblems = typeof def.customValidate === 'function' ? def.customValidate(files, params) : [];
    setClientErrors(perrors);
    setFileProblems(fproblems);
    setCustomProblems(cproblems);
    if (Object.keys(perrors).length > 0 || fproblems.length > 0 || cproblems.length > 0) return;
    execution.mutate(
      { def, files, params },
      {
        onSuccess: () => trackEvent('tool_completed', tool.slug),
        onError: (err) => {
          trackEvent('tool_failed', tool.slug);
          if (err?.code === 'RATE_LIMITED') {
            setCooldownUntil(Date.now() + 30_000);
          }
        },
      },
    );
  }

  const fileCountHint = def.files
    ? `${files.length}/${def.files.max} files${def.files.min > 1 ? ` (min ${def.files.min})` : ''}`
    : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">Input</h2>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{def.helper}</p>
            </div>
            {def.input === 'files' && (
              <>
                <FileDropzone
                  accept={acceptHint.accept}
                  multiple={(def.files?.max || 1) > 1}
                  maxSize={acceptHint.maxSize}
                  disabled={execution.isPending}
                  onFiles={(picked) => {
                    const merged = [...files, ...picked].slice(0, (def.files?.max || 20) + 5);
                    setFiles(merged);
                    setFileProblems(validateFiles(def, merged));
                    if (picked.length > 0) trackEvent('file_uploaded', tool.slug);
                  }}
                />
                <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)]">
                  <span>{fileCountHint}</span>
                  <span>Max {formatBytes(acceptHint.maxSize)} per file</span>
                </div>
                <FileQueue files={files} onRemove={(i) => setFiles((f) => f.filter((_, x) => x !== i))} />
                {fileProblems.length > 0 && (
                  <ul role="alert" className="list-disc space-y-1 pl-5 text-[13px] text-[var(--color-danger)]">
                    {fileProblems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {def.input === 'url' ? (
              <UrlInputForm fields={def.fields} values={params} errors={clientErrors} onChange={setParam} disabled={execution.isPending} />
            ) : (
              <ToolParameterForm fields={def.fields} values={params} errors={clientErrors} onChange={setParam} disabled={execution.isPending} />
            )}
            {inCooldown && (
              <p role="status" className="text-[13px] text-[var(--color-warning)]">
                Rate limited — wait a moment before running again.
              </p>
            )}
            {customProblems.length > 0 && (
              <ul role="alert" className="list-disc space-y-1 pl-5 text-[13px] text-[var(--color-danger)]">
                {customProblems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <Button3D onClick={onRun} loading={execution.isPending} disabled={inCooldown} className="w-full sm:w-auto">
              {execution.isPending ? 'Processing…' : 'Run'}
            </Button3D>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Result</h2>
          <div className="mt-2">
            <ToolResultPanel
              data={execution.data}
              error={execution.error}
              toolSlug={tool.slug}
              isRunning={execution.isPending}
            />
          </div>
          <div className="mt-3">
            <ToolPrivacyNotice />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-5">
        <ToolLimitations warnings={def.warnings} />
        <Card>
          <h2 className="font-semibold">How it works</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{def.helper}</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Public tool — no account needed. Generated files expire after about 1 hour.
          </p>
        </Card>
        {related.isLoading && <CardSkeletonGrid count={2} />}
        {related.data && <RelatedTools tools={related.data.items} currentSlug={tool.slug} />}
      </div>
    </div>
  );
}
