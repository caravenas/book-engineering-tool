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
import { CatalogPanelProvider } from '../components/CatalogPanel';

/**
 * A panel's controls, its drawing and its results are three components that
 * App composes into three separate columns. A test that drives a control and
 * then asserts on the resulting figure needs all of them mounted, so these
 * wrappers put back together what the layout takes apart. They exist only to
 * spare every test site from repeating the composition, and they mount exactly
 * what App mounts: nothing here decides what a panel shows. The imposition
 * screen carries the catalog provider because its options button reaches the
 * catalog through it; the others do not, since mounting the dialog they never
 * open would put its origin labels in front of tests asking about their own.
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
    <>
      <CanvasDesigner />
      <PagePreview />
    </>
  );
}

export function SpineCalculatorScreen() {
  return (
    <>
      <SpineCalculator />
      <SpinePreview />
      <SpineThicknessPreview />
      <SpineResults />
    </>
  );
}

export function BindingPanelScreen() {
  return (
    <>
      <BindingPanel />
      <BindingSpineResults />
    </>
  );
}

export function ImpositionVisualizerScreen() {
  return (
    <CatalogPanelProvider>
      <ImpositionVisualizer />
      <SheetPreview />
      <ImpositionResults />
    </CatalogPanelProvider>
  );
}

export function CoverPanelScreen() {
  return (
    <>
      <CoverPanel />
      <CoverPreview />
      <CoverResults />
    </>
  );
}
