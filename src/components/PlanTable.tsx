import type { Plan } from '../lib/chat'

export default function PlanTable({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold">{plan.title}</p>
      {plan.days.map((d) => (
        <div key={d.day} className="rounded-xl bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">{d.day}</p>
            <span className="text-xs text-muted">{d.focus}</span>
          </div>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-normal">动作</th>
                <th className="font-normal">组数</th>
                <th className="font-normal">次数</th>
                <th className="font-normal">重量</th>
                <th className="font-normal">休息</th>
              </tr>
            </thead>
            <tbody>
              {d.exercises.map((ex, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5 pr-2">{ex.name}</td>
                  <td>{ex.sets}</td>
                  <td>{ex.reps}</td>
                  <td>{ex.weight ?? '-'}</td>
                  <td>{ex.rest ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
