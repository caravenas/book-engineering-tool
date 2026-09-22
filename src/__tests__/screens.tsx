import { CanvasDesigner } from '../components/CanvasDesigner';
import { PagePreview } from '../components/PagePreview';
import { SpineCalculator } from '../components/SpineCalculator';
import { SpinePreview, SpineThicknessPreview } from '../components/SpinePreview';
import { SpineResults } from '../components/SpineResults';
import { BindingPanel } from '../components/BindingPanel';
import { BindingSpineResults } from '../components/BindingSpineResults';
import { ImpositionVisualizer } from '../components/ImpositionVisualizer';
import { ImpositionResults } from '../components/ImpositionResults';
import { SheetPreview } from '../components/SheetPreview';
import { CoverPanel } from '../components/CoverPanel';
import { CoverPreview } from '../components/CoverPreview';
import { CoverResults } from '../components/CoverResults';
import { SubstrateSelector } from '../components/SubstrateSelector';
import { CatalogPanelProvider } from '../components/CatalogPanel';
import { StepOptions } from '../components/StepOptions';
import { HowItIsCalculated } from '../components/HowItIsCalculated';

/**
 * A panel's controls, its drawing and its results are three components that
 * App composes into three separate columns. A test that drives a control and
 * then asserts on the resulting figure needs all of them mounted, so these
 * wrappers put back together what the layout takes apart. They exist only to
 * spare every test site from repeating the composition, and they mount exactly
 * what App mounts, the catalog provider included: every step reaches the
 * catalog through it since R-4b. The dialog renders nothing while closed, so
 * carrying it costs a test nothing and puts no stray text in front of it.
 *
 * Each one carries its step's way into the catalog, which since R-19 lives in
 * the margin of the step's title rather than beside each field: mounting the
 * panel without it would leave a screen the catalog cannot be reached from,
 * and half these tests are about what the catalog does to the step.
 *
 * They can drift from App without failing: drop a component from App and these
 * tests keep passing, because they mount it themselves. That is deliberate,
 * because proving App mounts everything is not their job. It belongs to
 * e2e/inventory.spec.ts, which counts every control and every result on the
 * real page and so fails the moment App stops rendering one. If that browser
 * guard is ever removed, this file becomes a way to be wrong quietly.
 */

export function CanvasDesignerScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="proportions" label="formato" />
      <CanvasDesigner />
      <PagePreview />
    </CatalogPanelProvider>
  );
}

export function SpineCalculatorScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="bindings" label="páginas y encuadernación" />
      <SpineCalculator />
      <SpinePreview />
      <SpineThicknessPreview />
      <SpineResults />
      <HowItIsCalculated />
    </CatalogPanelProvider>
  );
}

/**
 * Step 03 as the spec sheet composes it: the page counter and the binding
 * methods are one step, because a page count a method rejects is one
 * decision and not two. Tests that drive one and read the other need both,
 * which is exactly what the step gives the reader.
 */
export function PagesAndBindingScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="bindings" label="páginas y encuadernación" />
      <SpineCalculator />
      <BindingPanel />
      <BindingSpineResults />
      <HowItIsCalculated />
    </CatalogPanelProvider>
  );
}

export function BindingPanelScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="bindings" label="páginas y encuadernación" />
      <BindingPanel />
      <BindingSpineResults />
      <HowItIsCalculated />
    </CatalogPanelProvider>
  );
}

export function ImpositionVisualizerScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="presses" label="imposición" />
      <ImpositionVisualizer />
      <SheetPreview />
      <ImpositionResults />
    </CatalogPanelProvider>
  );
}

export function CoverPanelScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="covers" label="tapa" />
      <CoverPanel />
      <CoverPreview />
      <CoverResults />
    </CatalogPanelProvider>
  );
}

export function SubstrateSelectorScreen() {
  return (
    <CatalogPanelProvider>
      <StepOptions catalog="substrates" label="papel" />
      <SubstrateSelector />
    </CatalogPanelProvider>
  );
}
