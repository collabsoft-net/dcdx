import axios from 'axios';

type ReindexResponse = {
  progressUrl: string;
  currentProgress: number;
  success: boolean;
  finishTime?: string;
};

export const getReindexProgress = async (baseUrl: string): Promise<[ string, boolean, boolean ]> => {
  const response = await axios.get<ReindexResponse>(`${baseUrl}/rest/api/2/reindex`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`admin:admin`).toString('base64')}`
    }
  }).catch(() => null);

  const currentTask = (response && response.status === 200) ? response.data : {} as ReindexResponse;
  const { progressUrl, currentProgress, success, finishTime } = currentTask;
  const isFinished = currentProgress === 100 || success || finishTime != undefined

  return [ progressUrl, success, isFinished ];
}