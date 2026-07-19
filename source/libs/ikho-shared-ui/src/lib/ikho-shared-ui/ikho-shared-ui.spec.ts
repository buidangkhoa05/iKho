import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IkhoSharedUi } from './ikho-shared-ui';

describe('IkhoSharedUi', () => {
  let component: IkhoSharedUi;
  let fixture: ComponentFixture<IkhoSharedUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IkhoSharedUi],
    }).compileComponents();

    fixture = TestBed.createComponent(IkhoSharedUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
