<script lang="ts">
  import { onMount } from "svelte";

  export let domain: string = "";

  const steps = [
    "Resolving domain",
    "Checking security.txt",
    "Searching bug bounty databases",
    "Querying disclosure platforms",
    "Scanning DNS records",
    "Inspecting HTTP headers",
    "Analyzing TLS certificates",
    "Compiling results",
  ];

  let activeStep = 0;
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => {
      activeStep = (activeStep + 1) % steps.length;
    }, 800);
    return () => clearInterval(interval);
  });
</script>

<div class="loading-overlay" role="status" aria-live="polite">
  <div class="loading-card">
    <div class="scanner">
      <div class="ring"></div>
      <div class="ring delay"></div>
      <div class="dot"></div>
    </div>

    <h2>Scanning {domain || "domain"}</h2>

    <ul class="steps" aria-label="Lookup progress">
      {#each steps as step, i}
        <li class:done={i < activeStep} class:active={i === activeStep}>
          <span class="pip"></span>
          {step}
        </li>
      {/each}
    </ul>

    <p class="note">Querying 17 sources across two verification tiers</p>
  </div>
</div>

<style>
  .loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--background) 85%, transparent);
    backdrop-filter: blur(4px);
  }

  .loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 2.5rem 2rem;
    background: var(--background-lighter);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    max-width: 380px;
    width: 90%;
    text-align: center;
  }

  .scanner {
    position: relative;
    width: 48px;
    height: 48px;
  }

  .ring {
    position: absolute;
    inset: 0;
    border: 2px solid transparent;
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .ring.delay {
    inset: 6px;
    border-top-color: var(--success);
    animation-duration: 1.5s;
    animation-direction: reverse;
  }

  .dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    background: var(--primary);
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--primary);
    word-break: break-all;
  }

  .steps {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    width: 100%;
    text-align: left;
  }

  .steps li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--muted);
    transition: color 0.3s;

    &.active {
      color: var(--foreground);
    }

    &.done {
      color: var(--success);
    }
  }

  .pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
    flex-shrink: 0;
    transition: background 0.3s;

    .active & {
      background: var(--primary);
      box-shadow: 0 0 6px var(--primary);
    }

    .done & {
      background: var(--success);
    }
  }

  .note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--muted);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
